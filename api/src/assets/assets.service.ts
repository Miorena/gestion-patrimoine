import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { AssetFamily, Category, Location, State } from '../lookups/lookup.entities';
import { CreateAssetDto, EquipmentDto, RealEstateDto } from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetEquipment } from './entities/asset-equipment.entity';
import { AssetHistory } from './entities/asset-history.entity';
import { AssetRealEstate } from './entities/asset-real-estate.entity';
import { Asset } from './entities/asset.entity';

// Label of the "in service" state (RG04: only allowed once the acquisition is validated)
const IN_SERVICE_LABEL = 'En service';

// Fields compared to build the history of an update
const TRACKED_FIELDS = [
  'designation', 'acquisitionDate', 'acquisitionValue', 'acquisitionMode',
  'managedByLot', 'quantity', 'notes', 'categoryId', 'stateId', 'locationId',
] as const;

@Injectable()
export class AssetsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Asset) private readonly assetsRepository: Repository<Asset>,
    @InjectRepository(AssetHistory) private readonly historyRepository: Repository<AssetHistory>,
  ) {}

  // ---------- Reads ----------
  // Each read costs as few database round trips as possible: the database is remote,
  // so every sequential query adds the full network latency to the response time.

  async findAll(query: ListAssetsQueryDto) {
    const { page, limit, search, categoryId, stateId } = query;

    // Same filters for the page of items and for the total count
    const applyFilters = (qb: SelectQueryBuilder<Asset>) => {
      if (search?.trim()) {
        // Escape LIKE wildcards typed by the user
        const term = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
        qb.andWhere('(asset.designation ILIKE :term OR asset.code ILIKE :term)', { term });
      }
      if (categoryId) qb.andWhere('asset.categoryId = :categoryId', { categoryId });
      if (stateId) qb.andWhere('asset.stateId = :stateId', { stateId });
      return qb;
    };

    // offset/limit (not skip/take): the joins are all many-to-one, so rows are never duplicated
    // and TypeORM does not need its extra "select the ids first" query.
    const itemsQuery = applyFilters(
      this.assetsRepository
        .createQueryBuilder('asset')
        .leftJoinAndSelect('asset.category', 'category')
        .leftJoinAndSelect('asset.state', 'state')
        .leftJoinAndSelect('asset.location', 'location')
        .orderBy('asset.id', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit),
    );
    const countQuery = applyFilters(this.assetsRepository.createQueryBuilder('asset'));

    // The two queries run in parallel: one round trip instead of three in a row
    const [items, total] = await Promise.all([itemsQuery.getMany(), countQuery.getCount()]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    // A single query with all the joins (findOne + relations would split it in two)
    const asset = await this.assetsRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.state', 'state')
      .leftJoinAndSelect('asset.location', 'location')
      .leftJoinAndSelect('asset.equipment', 'equipment')
      .leftJoinAndSelect('asset.realEstate', 'realEstate')
      .where('asset.id = :id', { id })
      .getOne();
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async findHistory(id: number) {
    // The existence check (404) and the history are fetched at the same time
    const [exists, rows] = await Promise.all([
      this.assetsRepository.existsBy({ id }),
      this.historyRepository.find({
        where: { assetId: id },
        relations: { user: true },
        order: { createdAt: 'DESC', id: 'DESC' },
      }),
    ]);
    if (!exists) throw new NotFoundException(`Asset ${id} not found`);
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      details: row.details,
      userName: row.user.name,
    }));
  }

  // ---------- Writes ----------

  async create(dto: CreateAssetDto, userId: number) {
    this.assertDateNotInFuture(dto.acquisitionDate);

    const id = await this.dataSource.transaction(async (manager) => {
      const category = await this.getCategory(manager, dto.categoryId);
      const state = await this.getState(manager, dto.stateId);
      await this.assertLocationExists(manager, dto.locationId);
      this.assertExtensionMatchesFamily(category.family, dto.equipment, dto.realEstate, true);

      // New assets are not validated yet, and cannot start in a final state
      if (state.isFinal) {
        throw new BadRequestException('A new asset cannot be created in a final state');
      }
      if (state.label === IN_SERVICE_LABEL) {
        throw new BadRequestException('The acquisition must be validated before putting the asset in service');
      }

      const managedByLot = dto.managedByLot ?? false;
      const quantity = dto.quantity ?? 1;
      this.assertLotConsistency(category.family, managedByLot, quantity);

      const asset = await manager.save(
        manager.create(Asset, {
          designation: dto.designation,
          acquisitionDate: dto.acquisitionDate,
          acquisitionValue: dto.acquisitionValue,
          acquisitionMode: dto.acquisitionMode,
          managedByLot,
          quantity,
          notes: dto.notes ?? null,
          categoryId: dto.categoryId,
          stateId: dto.stateId,
          locationId: dto.locationId,
        }),
      );

      await this.saveExtension(manager, asset.id, category.family, dto.equipment, dto.realEstate);

      // The code is generated by the trigger: read it back for the history
      const { code } = await manager.findOneByOrFail(Asset, { id: asset.id });
      await this.addHistory(manager, asset.id, userId, 'ASSET_CREATED', `Code ${code}`);
      return asset.id;
    });

    return this.findOne(id);
  }

  async update(id: number, dto: UpdateAssetDto, userId: number) {
    if (dto.acquisitionDate) this.assertDateNotInFuture(dto.acquisitionDate);

    await this.dataSource.transaction(async (manager) => {
      // Lock the row so two concurrent updates cannot overlap
      const asset = await manager.findOne(Asset, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!asset) throw new NotFoundException(`Asset ${id} not found`);

      const currentState = await this.getState(manager, asset.stateId);
      if (currentState.isFinal) {
        throw new ConflictException('An asset in a final state can no longer be modified');
      }
      const currentCategory = await this.getCategory(manager, asset.categoryId);

      // Category: a change is only allowed inside the same family
      if (dto.categoryId && dto.categoryId !== asset.categoryId) {
        const newCategory = await this.getCategory(manager, dto.categoryId);
        if (newCategory.family !== currentCategory.family) {
          throw new BadRequestException('The category must belong to the same family as the current one');
        }
      }

      // State: no final state here (handled by the exit process), RG04 for "in service"
      if (dto.stateId && dto.stateId !== asset.stateId) {
        const newState = await this.getState(manager, dto.stateId);
        if (newState.isFinal) {
          throw new BadRequestException('A final state can only be set through the exit process');
        }
        if (newState.label === IN_SERVICE_LABEL && !asset.acquisitionValidated) {
          throw new BadRequestException('The acquisition must be validated before putting the asset in service');
        }
      }

      if (dto.locationId && dto.locationId !== asset.locationId) {
        await this.assertLocationExists(manager, dto.locationId);
      }
      this.assertExtensionMatchesFamily(currentCategory.family, dto.equipment, dto.realEstate, false);

      // Apply the changes and record which fields changed
      const changes: Record<string, [unknown, unknown]> = {};
      for (const field of TRACKED_FIELDS) {
        const newValue = dto[field];
        if (newValue !== undefined && newValue !== asset[field]) {
          changes[field] = [asset[field], newValue];
          (asset as any)[field] = newValue;
        }
      }
      this.assertLotConsistency(currentCategory.family, asset.managedByLot, asset.quantity);
      // TODO (affectations): refuse a quantity lower than the quantity already assigned

      await manager.save(asset);
      // Only recorded in the history when the equipment / real estate details really changed
      const extensionChanged = await this.saveExtension(manager, id, currentCategory.family, dto.equipment, dto.realEstate);
      if (extensionChanged) changes['extension'] = [null, 'updated'];

      if (Object.keys(changes).length > 0) {
        await this.addHistory(manager, id, userId, 'ASSET_UPDATED', JSON.stringify(changes));
      }
    });

    return this.findOne(id);
  }

  async validateAcquisition(id: number, userId: number) {
    await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(Asset, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!asset) throw new NotFoundException(`Asset ${id} not found`);
      if (asset.acquisitionValidated) {
        throw new ConflictException('The acquisition is already validated');
      }
      asset.acquisitionValidated = true;
      await manager.save(asset);
      await this.addHistory(manager, id, userId, 'ACQUISITION_VALIDATED', null);
    });
    return this.findOne(id);
  }

  // ---------- Helpers ----------

  private assertDateNotInFuture(date: string) {
    const today = new Date().toISOString().slice(0, 10);
    if (date > today) throw new BadRequestException('The acquisition date cannot be in the future');
  }

  // A standalone asset has quantity 1; real estate is never managed by lot
  private assertLotConsistency(family: AssetFamily, managedByLot: boolean, quantity: number) {
    if (family === AssetFamily.REAL_ESTATE && managedByLot) {
      throw new BadRequestException('Real estate cannot be managed by lot');
    }
    if (!managedByLot && quantity !== 1) {
      throw new BadRequestException('An asset not managed by lot must have a quantity of 1');
    }
  }

  // Extension must match category.family (equipment XOR real estate)
  private assertExtensionMatchesFamily(
    family: AssetFamily,
    equipment: EquipmentDto | undefined,
    realEstate: RealEstateDto | undefined,
    isCreation: boolean,
  ) {
    if (family === AssetFamily.EQUIPMENT && realEstate) {
      throw new BadRequestException('Real estate details are not allowed for an equipment category');
    }
    if (family === AssetFamily.REAL_ESTATE && equipment) {
      throw new BadRequestException('Equipment details are not allowed for a real estate category');
    }
    if (family === AssetFamily.REAL_ESTATE && isCreation && !realEstate) {
      throw new BadRequestException('Real estate details are required for this category');
    }
  }

  // Insert or update the extension row matching the family.
  // Returns true when an existing row was modified (so the history only logs real changes).
  private async saveExtension(
    manager: EntityManager,
    assetId: number,
    family: AssetFamily,
    equipment?: EquipmentDto,
    realEstate?: RealEstateDto,
  ): Promise<boolean> {
    if (family === AssetFamily.EQUIPMENT) {
      // The equipment row always exists; a provided object replaces all its fields
      const current = await manager.findOneBy(AssetEquipment, { assetId });
      const next = {
        brand: equipment?.brand ?? null,
        model: equipment?.model ?? null,
        serialNumber: equipment?.serialNumber ?? null,
      };
      if (!current) {
        await manager.save(AssetEquipment, { assetId, ...next });
        return false; // creation, not a modification
      }
      if (!equipment) return false;
      const changed =
        current.brand !== next.brand || current.model !== next.model || current.serialNumber !== next.serialNumber;
      if (changed) await manager.save(AssetEquipment, { assetId, ...next });
      return changed;
    }

    if (!realEstate) return false;
    const current = await manager.findOneBy(AssetRealEstate, { assetId });
    const next = {
      address: realEstate.address,
      area: realEstate.area,
      cadastralReference: realEstate.cadastralReference ?? null,
      kind: realEstate.kind,
    };
    if (!current) {
      await manager.save(AssetRealEstate, { assetId, ...next });
      return false;
    }
    const changed =
      current.address !== next.address ||
      Number(current.area) !== Number(next.area) ||
      current.cadastralReference !== next.cadastralReference ||
      current.kind !== next.kind;
    if (changed) await manager.save(AssetRealEstate, { assetId, ...next });
    return changed;
  }

  private addHistory(manager: EntityManager, assetId: number, userId: number, action: string, details: string | null) {
    return manager.insert(AssetHistory, { assetId, userId, action, details });
  }

  private async getCategory(manager: EntityManager, id: number) {
    const category = await manager.findOneBy(Category, { id });
    if (!category) throw new BadRequestException(`Category ${id} does not exist`);
    return category;
  }

  private async getState(manager: EntityManager, id: number) {
    const state = await manager.findOneBy(State, { id });
    if (!state) throw new BadRequestException(`State ${id} does not exist`);
    return state;
  }

  private async assertLocationExists(manager: EntityManager, id: number) {
    if (!(await manager.existsBy(Location, { id }))) {
      throw new BadRequestException(`Location ${id} does not exist`);
    }
  }
}

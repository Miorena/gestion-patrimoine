import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { AssetFamily } from '../lookups/enums/asset-family.enum';
import { Category } from '../lookups/entities/category.entity';
import { Location } from '../lookups/entities/location.entity';
import { State } from '../lookups/entities/state.entity';
import { CreateAssetDto, EquipmentDto, RealEstateDto } from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { ListHistoryQueryDto } from './dto/list-history-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetEquipment } from './entities/asset-equipment.entity';
import { AssetHistory } from './entities/asset-history.entity';
import { AssetRealEstate } from './entities/asset-real-estate.entity';
import { Asset } from './entities/asset.entity';
import { assertDateNotInFuture, assertExtensionMatchesFamily, assertLotConsistency, IN_SERVICE_LABEL, TRACKED_FIELDS } from './asset.rules';

@Injectable()
export class AssetsService {
	constructor(
		@InjectDataSource() private readonly dataSource: DataSource,
		@InjectRepository(Asset) private readonly assetsRepository: Repository<Asset>,
		@InjectRepository(AssetHistory) private readonly historyRepository: Repository<AssetHistory>,
	) { }

	// ---------- Lectures ----------
	// Chaque lecture coûte le moins d'allers-retours possible vers la base : la base est distante,
	// donc chaque requête séquentielle ajoute toute la latence réseau au temps de réponse.

	async findAll(query: ListAssetsQueryDto) {
		const { page, limit, search, categoryId, stateId } = query;

		// Mêmes filtres pour la page de résultats et pour le décompte total
		const applyFilters = (qb: SelectQueryBuilder<Asset>) => {
			if (search?.trim()) {
				// Échappe les jokers LIKE saisis par l'utilisateur
				const term = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
				qb.andWhere('(asset.designation ILIKE :term OR asset.code ILIKE :term)', { term });
			}
			if (categoryId) qb.andWhere('asset.categoryId = :categoryId', { categoryId });
			if (stateId) qb.andWhere('asset.stateId = :stateId', { stateId });
			return qb;
		};

		// offset/limit (et non skip/take) : les jointures sont toutes de type many-to-one, donc les lignes ne sont jamais dupliquées
		// et TypeORM n'a pas besoin de sa requête supplémentaire « sélection des ids d'abord »
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

		// Les deux requêtes s'exécutent en parallèle : un aller-retour au lieu de trois à la suite
		const [items, total] = await Promise.all([itemsQuery.getMany(), countQuery.getCount()]);
		return { items, total, page, limit };
	}

	async findOne(id: number) {
		// Une seule requête avec toutes les jointures (findOne + relations la scinderait en deux)
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
		// La vérification d'existence (404) et l'historique sont récupérés en même temps
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

	// Historique global : tous les événements de tous les biens, avec recherche, filtre, tri et pagination
	async findAllHistory(query: ListHistoryQueryDto) {
		const { page, limit, search, action, sort, order } = query;

		// Liste blanche : la clé de tri venant du client n'entre jamais telle quelle dans le SQL
		const sortColumns = {
			date: 'history.createdAt',
			action: 'history.action',
			asset: 'asset.code',
			user: 'user.name',
		} as const;

		const applyFilters = (qb: SelectQueryBuilder<AssetHistory>) => {
			if (search?.trim()) {
				const term = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
				qb.andWhere(
					'(asset.designation ILIKE :term OR asset.code ILIKE :term OR user.name ILIKE :term OR history.details ILIKE :term)',
					{ term },
				);
			}
			if (action) qb.andWhere('history.action = :action', { action });
			return qb;
		};

		const base = () =>
			this.historyRepository
				.createQueryBuilder('history')
				.innerJoinAndSelect('history.asset', 'asset')
				.innerJoinAndSelect('history.user', 'user');

		const itemsQuery = applyFilters(base())
			.orderBy(sortColumns[sort], order)
			.addOrderBy('history.id', order)
			.offset((page - 1) * limit)
			.limit(limit);
		const countQuery = applyFilters(base());

		const [rows, total] = await Promise.all([itemsQuery.getMany(), countQuery.getCount()]);
		const items = rows.map((row) => ({
			id: row.id,
			createdAt: row.createdAt,
			action: row.action,
			details: row.details,
			userName: row.user.name,
			assetId: row.assetId,
			assetCode: row.asset.code,
			assetDesignation: row.asset.designation,
		}));
		return { items, total, page, limit };
	}

	// ---------- Écritures ----------

	async create(dto: CreateAssetDto, userId: number) {
		assertDateNotInFuture(dto.acquisitionDate);

		const id = await this.dataSource.transaction(async (manager) => {
			const category = await this.getCategory(manager, dto.categoryId);
			const state = await this.getState(manager, dto.stateId);
			await this.assertLocationExists(manager, dto.locationId);
			assertExtensionMatchesFamily(category.family, dto.equipment, dto.realEstate, true);

			// Les nouveaux biens ne sont pas encore validés et ne peuvent pas démarrer dans un état final
			if (state.isFinal) {
				throw new BadRequestException('A new asset cannot be created in a final state');
			}
			if (state.label === IN_SERVICE_LABEL) {
				throw new BadRequestException('The acquisition must be validated before putting the asset in service');
			}

			const managedByLot = dto.managedByLot ?? false;
			const quantity = dto.quantity ?? 1;
			assertLotConsistency(category.family, managedByLot, quantity);

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

			// Le code est généré par le trigger : on le relit pour l'historique
			const { code } = await manager.findOneByOrFail(Asset, { id: asset.id });
			await this.addHistory(manager, asset.id, userId, 'ASSET_CREATED', `Code ${code}`);
			return asset.id;
		});

		return this.findOne(id);
	}

	async update(id: number, dto: UpdateAssetDto, userId: number) {
		if (dto.acquisitionDate) assertDateNotInFuture(dto.acquisitionDate);

		await this.dataSource.transaction(async (manager) => {
			// Verrouille la ligne pour que deux modifications concurrentes ne se chevauchent pas
			const asset = await manager.findOne(Asset, { where: { id }, lock: { mode: 'pessimistic_write' } });
			if (!asset) throw new NotFoundException(`Asset ${id} not found`);

			const currentState = await this.getState(manager, asset.stateId);
			if (currentState.isFinal) {
				throw new ConflictException('An asset in a final state can no longer be modified');
			}
			const currentCategory = await this.getCategory(manager, asset.categoryId);

			// Catégorie : un changement n'est autorisé qu'à l'intérieur de la même famille
			if (dto.categoryId && dto.categoryId !== asset.categoryId) {
				const newCategory = await this.getCategory(manager, dto.categoryId);
				if (newCategory.family !== currentCategory.family) {
					throw new BadRequestException('The category must belong to the same family as the current one');
				}
			}

			// État : pas d'état final ici (géré par le processus de sortie), RG04 pour « en service »
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
			assertExtensionMatchesFamily(currentCategory.family, dto.equipment, dto.realEstate, false);

			// Applique les changements et enregistre les champs modifiés
			const changes: Record<string, [unknown, unknown]> = {};
			for (const field of TRACKED_FIELDS) {
				const newValue = dto[field];
				if (newValue !== undefined && newValue !== asset[field]) {
					changes[field] = [asset[field], newValue];
					(asset as any)[field] = newValue;
				}
			}
			assertLotConsistency(currentCategory.family, asset.managedByLot, asset.quantity);
			// TODO (affectations) : refuser une quantité inférieure à la quantité déjà affectée

			await manager.save(asset);
			// Enregistré dans l'historique uniquement si les détails équipement / immobilier ont réellement changé
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

	// ---------- Utilitaires ----------

	// Insère ou met à jour la ligne d'extension correspondant à la famille.
	// Renvoie true si une ligne existante a été modifiée (l'historique ne consigne ainsi que les vrais changements).
	private async saveExtension(
		manager: EntityManager,
		assetId: number,
		family: AssetFamily,
		equipment?: EquipmentDto,
		realEstate?: RealEstateDto,
	): Promise<boolean> {
		if (family === AssetFamily.EQUIPMENT) {
			// La ligne équipement existe toujours ; un objet fourni remplace tous ses champs
			const current = await manager.findOneBy(AssetEquipment, { assetId });
			const next = {
				brand: equipment?.brand ?? null,
				model: equipment?.model ?? null,
				serialNumber: equipment?.serialNumber ?? null,
			};
			if (!current) {
				await manager.save(AssetEquipment, { assetId, ...next });
				return false; // création, pas une modification
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

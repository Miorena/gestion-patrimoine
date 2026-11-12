import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import { CreateAgentDto, CreateDirectionDto, CreateServiceDto, RenameDto, UpdateAgentDto } from './dto/organization.dto';
import { Agent } from './entities/agent.entity';
import { Direction } from './entities/direction.entity';
import { Service } from './entities/service.entity';

// Codes d'erreur PostgreSQL
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class OrganizationService {
	constructor(
		@InjectRepository(Direction) private readonly directions: Repository<Direction>,
		@InjectRepository(Service) private readonly services: Repository<Service>,
		@InjectRepository(Agent) private readonly agents: Repository<Agent>,
	) { }

	// ---------- Lecture ----------

	// Toute l'organisation en une seule requête : directions > services > agents (données peu nombreuses)
	findAll() {
		return this.directions.find({
			relations: { services: { agents: true } },
			order: { name: 'ASC', services: { name: 'ASC', agents: { lastName: 'ASC', firstName: 'ASC' } } },
		});
	}

	// ---------- Ajout ----------

	async createDirection(dto: CreateDirectionDto) {
		try {
			return await this.directions.save(this.directions.create({ name: dto.name }));
		} catch (error) {
			if (this.isViolation(error, UNIQUE_VIOLATION)) {
				throw new ConflictException('Une direction portant ce nom existe déjà.');
			}
			throw error;
		}
	}

	async createService(dto: CreateServiceDto) {
		if (!(await this.directions.existsBy({ id: dto.directionId }))) {
			throw new NotFoundException(`Direction ${dto.directionId} introuvable`);
		}
		try {
			return await this.services.save(this.services.create({ name: dto.name, directionId: dto.directionId }));
		} catch (error) {
			if (this.isViolation(error, UNIQUE_VIOLATION)) {
				throw new ConflictException('Cette direction possède déjà un service portant ce nom.');
			}
			throw error;
		}
	}

	async createAgent(dto: CreateAgentDto) {
		if (!(await this.services.existsBy({ id: dto.serviceId }))) {
			throw new NotFoundException(`Service ${dto.serviceId} introuvable`);
		}
		return this.agents.save(
			this.agents.create({
				lastName: dto.lastName,
				firstName: dto.firstName,
				position: dto.position || null,
				serviceId: dto.serviceId,
			}),
		);
	}

	// ---------- Modification ----------

	async renameDirection(id: number, dto: RenameDto) {
		const direction = await this.directions.findOneBy({ id });
		if (!direction) throw new NotFoundException(`Direction ${id} introuvable`);
		direction.name = dto.name;
		return this.saveUnique(() => this.directions.save(direction), 'Une direction portant ce nom existe déjà.');
	}

	async renameService(id: number, dto: RenameDto) {
		const service = await this.services.findOneBy({ id });
		if (!service) throw new NotFoundException(`Service ${id} introuvable`);
		service.name = dto.name;
		return this.saveUnique(() => this.services.save(service), 'Cette direction possède déjà un service portant ce nom.');
	}

	// Seuls les champs fournis changent ; serviceId déplace l'agent vers un autre service
	async updateAgent(id: number, dto: UpdateAgentDto) {
		const agent = await this.agents.findOneBy({ id });
		if (!agent) throw new NotFoundException(`Agent ${id} introuvable`);

		if (dto.serviceId !== undefined && dto.serviceId !== agent.serviceId) {
			if (!(await this.services.existsBy({ id: dto.serviceId }))) {
				throw new NotFoundException(`Service ${dto.serviceId} introuvable`);
			}
			agent.serviceId = dto.serviceId;
		}
		if (dto.lastName !== undefined) agent.lastName = dto.lastName;
		if (dto.firstName !== undefined) agent.firstName = dto.firstName;
		if (dto.position !== undefined) agent.position = dto.position || null;
		return this.agents.save(agent);
	}

	// ---------- Suppression ----------
	// La base refuse (RESTRICT) de supprimer un élément encore utilisé : on le traduit en message clair.

	removeDirection(id: number) {
		return this.remove(
			this.directions,
			id,
			'Direction',
			'Impossible de supprimer cette direction : elle contient encore des services. Supprimez d’abord ses services.',
		);
	}

	removeService(id: number) {
		return this.remove(
			this.services,
			id,
			'Service',
			'Impossible de supprimer ce service : il contient encore des agents ou des biens lui sont affectés.',
		);
	}

	removeAgent(id: number) {
		return this.remove(
			this.agents,
			id,
			'Agent',
			'Impossible de supprimer cet agent : des biens lui sont ou lui ont été affectés.',
		);
	}

	// ---------- Utilitaires ----------

	private async remove<T extends ObjectLiteral & { id: number }>(
		repository: Repository<T>,
		id: number,
		label: string,
		inUseMessage: string,
	) {
		const entity = await repository.findOneBy({ id } as never);
		if (!entity) throw new NotFoundException(`${label} ${id} introuvable`);
		try {
			await repository.remove(entity);
		} catch (error) {
			if (this.isViolation(error, FOREIGN_KEY_VIOLATION)) throw new ConflictException(inUseMessage);
			throw error;
		}
	}

	// Enregistre et traduit une violation d'unicité (doublon de nom) en message clair
	private async saveUnique<T>(save: () => Promise<T>, conflictMessage: string) {
		try {
			return await save();
		} catch (error) {
			if (this.isViolation(error, UNIQUE_VIOLATION)) throw new ConflictException(conflictMessage);
			throw error;
		}
	}

	private isViolation(error: unknown, code: string) {
		return error instanceof QueryFailedError && (error.driverError as { code?: string })?.code === code;
	}
}

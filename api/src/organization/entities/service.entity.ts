import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Agent } from './agent.entity';
import { Direction } from './direction.entity';

@Entity('service')
export class Service {
	@PrimaryGeneratedColumn('identity', { name: 'id_service', generatedIdentity: 'ALWAYS' })
	id: number;

	@Column({ name: 'nom', length: 150 })
	name: string;

	@Column({ name: 'id_direction' })
	directionId: number;

	@ManyToOne(() => Direction, (direction) => direction.services, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_direction' })
	direction: Direction;

	@OneToMany(() => Agent, (agent) => agent.service)
	agents: Agent[];
}

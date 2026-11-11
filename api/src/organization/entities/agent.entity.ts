import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from './service.entity';

@Entity('agent')
export class Agent {
	@PrimaryGeneratedColumn('identity', { name: 'id_agent', generatedIdentity: 'ALWAYS' })
	id: number;

	@Column({ name: 'nom', length: 100 })
	lastName: string;

	@Column({ name: 'prenom', length: 100 })
	firstName: string;

	// Poste occupé (facultatif)
	@Column({ name: 'fonction', type: 'varchar', length: 150, nullable: true })
	position: string | null;

	@Column({ name: 'id_service' })
	serviceId: number;

	@ManyToOne(() => Service, (service) => service.agents, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_service' })
	service: Service;
}

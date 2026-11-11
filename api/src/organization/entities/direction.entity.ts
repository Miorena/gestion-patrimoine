import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from './service.entity';

@Entity('direction')
export class Direction {
	@PrimaryGeneratedColumn('identity', { name: 'id_direction', generatedIdentity: 'ALWAYS' })
	id: number;

	@Column({ name: 'nom', length: 150, unique: true })
	name: string;

	@OneToMany(() => Service, (service) => service.direction)
	services: Service[];
}

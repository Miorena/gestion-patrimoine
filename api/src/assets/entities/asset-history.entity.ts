import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Append-only (a database trigger forbids UPDATE and DELETE)
@Entity('historique')
export class AssetHistory {
	@PrimaryGeneratedColumn('identity', { name: 'id_historique', generatedIdentity: 'ALWAYS' })
	id: number;

	@CreateDateColumn({ name: 'date_heure', type: 'timestamptz' })
	createdAt: Date;

	@Column({ length: 50 })
	action: string;

	@Column({ type: 'text', nullable: true })
	details: string | null;

	@Column({ name: 'id_bien' })
	assetId: number;

	@Column({ name: 'id_utilisateur' })
	userId: number;
	@ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_utilisateur' })
	user: User;
}

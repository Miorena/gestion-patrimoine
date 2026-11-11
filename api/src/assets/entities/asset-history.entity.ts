import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Asset } from './asset.entity';

// Ajout seul (un trigger de la base interdit UPDATE et DELETE)
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
	@ManyToOne(() => Asset, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_bien' })
	asset: Asset;

	@Column({ name: 'id_utilisateur' })
	userId: number;
	@ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_utilisateur' })
	user: User;
}

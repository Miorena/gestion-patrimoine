import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { Category } from '../../lookups/entities/category.entity';
import { Location } from '../../lookups/entities/location.entity';
import { State } from '../../lookups/entities/state.entity';
import { AssetEquipment } from './asset-equipment.entity';
import { AssetRealEstate } from './asset-real-estate.entity';
import { AcquisitionMode } from '../enums/acquisition-mode.enum';

@Entity('bien')
export class Asset {
	@PrimaryGeneratedColumn('identity', { name: 'id_bien', generatedIdentity: 'ALWAYS' })
	id: number;

	// Généré par un trigger de la base (PAT-YYYY-NNNNN) : jamais écrit par l'API
	@Column({ name: 'code', length: 20, unique: true, insert: false, update: false })
	code: string;

	@Column({ name: 'designation', length: 200 })
	designation: string;

	// Colonne DATE : conservée sous forme de chaîne 'YYYY-MM-DD' (pas de surprise de fuseau horaire)
	@Column({ name: 'date_acquisition', type: 'date' })
	acquisitionDate: string;

	@Column({ name: 'valeur_acquisition', type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
	acquisitionValue: number;

	@Column({ name: 'mode_acquisition', length: 30 })
	acquisitionMode: AcquisitionMode;

	@Column({ name: 'acquisition_validee', default: false })
	acquisitionValidated: boolean;

	@Column({ name: 'gere_par_lot', default: false })
	managedByLot: boolean;

	@Column({ name: 'quantite', default: 1 })
	quantity: number;

	@Column({ name: 'observations', type: 'text', nullable: true })
	notes: string | null;

	@Column({ name: 'id_categorie' })
	categoryId: number;
	@ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_categorie' })
	category: Category;

	@Column({ name: 'id_etat' })
	stateId: number;
	@ManyToOne(() => State, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_etat' })
	state: State;

	@Column({ name: 'id_localisation' })
	locationId: number;
	@ManyToOne(() => Location, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_localisation' })
	location: Location;

	// Extension : une seule des deux existe, selon category.family
	@OneToOne(() => AssetEquipment, (extension) => extension.asset)
	equipment?: AssetEquipment | null;

	@OneToOne(() => AssetRealEstate, (extension) => extension.asset)
	realEstate?: AssetRealEstate | null;
}

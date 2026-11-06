import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { Asset } from './asset.entity';

// Values match the CHECK constraint on bien_immobilier.nature
export enum RealEstateKind {
	BUILDING = 'batiment',
	LAND = 'terrain',
}

@Entity('bien_immobilier')
export class AssetRealEstate {
	@PrimaryColumn({ name: 'id_bien' })
	assetId: number;

	@OneToOne(() => Asset, (asset) => asset.realEstate, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_bien' })
	asset: Asset;

	@Column({ name: 'adresse', length: 255 })
	address: string;

	// Surface area (m²)
	@Column({ name: 'superficie', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
	area: number;

	@Column({ name: 'reference_cadastrale', type: 'varchar', length: 100, nullable: true })
	cadastralReference: string | null;

	@Column({ name: 'nature', length: 10 })
	kind: RealEstateKind;
}

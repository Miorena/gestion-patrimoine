import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { Asset } from './asset.entity';
import { RealEstateKind } from '../enums/real-estate-kind.enum';

@Entity('bien_immobilier')
export class AssetRealEstate {
	@PrimaryColumn({ name: 'id_bien' })
	assetId: number;

	@OneToOne(() => Asset, (asset) => asset.realEstate, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'id_bien' })
	asset: Asset;

	@Column({ name: 'adresse', length: 255 })
	address: string;

	// Superficie (m²)
	@Column({ name: 'superficie', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
	area: number;

	@Column({ name: 'reference_cadastrale', type: 'varchar', length: 100, nullable: true })
	cadastralReference: string | null;

	@Column({ name: 'nature', length: 10 })
	kind: RealEstateKind;
}

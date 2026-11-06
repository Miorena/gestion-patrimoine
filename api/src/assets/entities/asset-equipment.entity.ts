import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Asset } from './asset.entity';

@Entity('bien_equipement')
export class AssetEquipment {
  @PrimaryColumn({ name: 'id_bien' })
  assetId: number;

  @OneToOne(() => Asset, (asset) => asset.equipment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_bien' })
  asset: Asset;

  @Column({ name: 'marque', type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ name: 'modele', type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ name: 'numero_serie', type: 'varchar', length: 100, nullable: true })
  serialNumber: string | null;
}

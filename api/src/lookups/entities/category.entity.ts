import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AssetFamily } from '../enums/asset-family.enum';

@Entity('categorie')
export class Category {
  @PrimaryGeneratedColumn('identity', { name: 'id_categorie', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'libelle', length: 100, unique: true })
  label: string;

  @Column({ name: 'famille', length: 12 })
  family: AssetFamily;
}

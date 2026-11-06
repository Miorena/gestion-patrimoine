import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Which extension table a category uses
export enum AssetFamily {
  EQUIPMENT = 'equipement',
  REAL_ESTATE = 'immobilier',
}

@Entity('categorie')
export class Category {
  @PrimaryGeneratedColumn('identity', { name: 'id_categorie', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'libelle', length: 100, unique: true })
  label: string;

  @Column({ name: 'famille', length: 12 })
  family: AssetFamily;
}

// "etat" table: condition/status of an asset
@Entity('etat')
export class State {
  @PrimaryGeneratedColumn('identity', { name: 'id_etat', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'libelle', length: 50, unique: true })
  label: string;

  // A final state (disposed, scrapped, lost) is irreversible
  @Column({ name: 'est_final', default: false })
  isFinal: boolean;
}

@Entity('localisation')
export class Location {
  @PrimaryGeneratedColumn('identity', { name: 'id_localisation', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'nom', length: 150 })
  name: string;

  @Column({ length: 10 })
  type: string; // site | batiment | bureau | salle

  @Column({ name: 'id_parent', type: 'int', nullable: true })
  parentId: number | null;
}

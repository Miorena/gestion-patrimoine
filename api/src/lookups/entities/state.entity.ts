import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Table "etat" : état d'un bien
@Entity('etat')
export class State {
  @PrimaryGeneratedColumn('identity', { name: 'id_etat', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'libelle', length: 50, unique: true })
  label: string;

  // Un état final (cédé, réformé, perdu) est irréversible
  @Column({ name: 'est_final', default: false })
  isFinal: boolean;
}

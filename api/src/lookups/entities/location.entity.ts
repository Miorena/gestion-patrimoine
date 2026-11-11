import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

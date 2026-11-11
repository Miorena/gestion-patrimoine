import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('identity', { name: 'id_role', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'libelle', length: 50, unique: true })
  label: string;
}

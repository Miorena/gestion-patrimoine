import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('utilisateur')
export class User {
  @PrimaryGeneratedColumn('identity', { name: 'id_utilisateur', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ name: 'nom', length: 150 })
  name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'mot_de_passe_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'id_role' })
  roleId: number;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_role' })
  role: Role;
}

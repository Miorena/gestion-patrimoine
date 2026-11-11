import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({ relations: { role: true }, order: { name: 'ASC' } });
    return users.map((user) => this.toView(user));
  }

  findRoles() {
    return this.rolesRepository.find({ order: { id: 'ASC' } });
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.usersRepository.existsBy({ email })) {
      throw new ConflictException('Un utilisateur avec cette adresse e-mail existe déjà.');
    }
    await this.assertRoleExists(dto.roleId);

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        name: dto.name,
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: dto.roleId,
      }),
    );
    return this.findOne(user.id);
  }

  async update(id: number, dto: UpdateUserDto, currentUserId: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);

    if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
      // Évite qu'un administrateur se retire lui-même ses droits et verrouille l'administration
      if (id === currentUserId) {
        throw new ForbiddenException('Vous ne pouvez pas modifier votre propre rôle.');
      }
      await this.assertRoleExists(dto.roleId);
      user.roleId = dto.roleId;
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.password !== undefined) user.passwordHash = await bcrypt.hash(dto.password, 10);

    // Mise à jour ciblée des seules colonnes modifiables
    await this.usersRepository.update(id, {
      name: user.name,
      roleId: user.roleId,
      passwordHash: user.passwordHash,
    });
    return this.findOne(id);
  }

  private async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id }, relations: { role: true } });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);
    return this.toView(user);
  }

  private async assertRoleExists(roleId: number) {
    if (!(await this.rolesRepository.existsBy({ id: roleId }))) {
      throw new BadRequestException(`Le rôle ${roleId} n'existe pas.`);
    }
  }

  // N'expose jamais le hash du mot de passe
  private toView(user: User) {
    return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, role: user.role.label };
  }
}

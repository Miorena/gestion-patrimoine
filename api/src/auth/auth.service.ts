import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { JwtPayload } from './types/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: { role: true },
    });

    // Même message pour un e-mail inconnu et un mauvais mot de passe (pas d'énumération des utilisateurs)
    const isValid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role.label };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.toProfile(user),
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { role: true },
    });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.toProfile(user);
  }

  // N'expose jamais le hash du mot de passe
  private toProfile(user: User) {
    return { id: user.id, name: user.name, email: user.email, role: user.role.label };
  }
}

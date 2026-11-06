import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  exports: [TypeOrmModule],
})
export class UsersModule {}

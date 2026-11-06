import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LookupsController } from './lookups.controller';
import { Category, Location, State } from './lookup.entities';

@Module({
  imports: [TypeOrmModule.forFeature([Category, State, Location])],
  controllers: [LookupsController],
  exports: [TypeOrmModule],
})
export class LookupsModule {}

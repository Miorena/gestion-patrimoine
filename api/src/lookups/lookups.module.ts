import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LookupsController } from './lookups.controller';
import { Category } from './entities/category.entity';
import { Location } from './entities/location.entity';
import { State } from './entities/state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, State, Location])],
  controllers: [LookupsController],
  exports: [TypeOrmModule],
})
export class LookupsModule {}

import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Location } from './entities/location.entity';
import { State } from './entities/state.entity';

// Données de référence en lecture seule nécessaires au formulaire de bien (le CRUD complet viendra plus tard)
@Controller('lookups')
export class LookupsController {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(State) private readonly states: Repository<State>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  @Get()
  async findAll() {
    const [categories, states, locations] = await Promise.all([
      this.categories.find({ order: { label: 'ASC' } }),
      this.states.find({ order: { id: 'ASC' } }),
      this.locations.find({ order: { name: 'ASC' } }),
    ]);
    return { categories, states, locations };
  }
}

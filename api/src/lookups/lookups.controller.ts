import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Location, State } from './lookup.entities';

// Read-only reference data needed by the asset form (full CRUD comes later)
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

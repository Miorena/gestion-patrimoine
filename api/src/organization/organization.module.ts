import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { Direction } from './entities/direction.entity';
import { Service } from './entities/service.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
	imports: [TypeOrmModule.forFeature([Direction, Service, Agent])],
	controllers: [OrganizationController],
	providers: [OrganizationService],
	exports: [TypeOrmModule],
})
export class OrganizationModule { }

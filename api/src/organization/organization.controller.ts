import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../users/enums/role-name.enum';
import { CreateAgentDto, CreateDirectionDto, CreateServiceDto, RenameDto, UpdateAgentDto } from './dto/organization.dto';
import { OrganizationService } from './organization.service';

@Controller('organization')
export class OrganizationController {
	constructor(private readonly organizationService: OrganizationService) { }

	// La lecture est ouverte à tout utilisateur connecté (utile pour les affectations)
	@Get()
	findAll() {
		return this.organizationService.findAll();
	}

	// L'ajout, la modification et la suppression sont réservés à l'administrateur
	@Roles(RoleName.ADMINISTRATOR)
	@Post('directions')
	createDirection(@Body() dto: CreateDirectionDto) {
		return this.organizationService.createDirection(dto);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Patch('directions/:id')
	renameDirection(@Param('id', ParseIntPipe) id: number, @Body() dto: RenameDto) {
		return this.organizationService.renameDirection(id, dto);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Delete('directions/:id')
	@HttpCode(204)
	removeDirection(@Param('id', ParseIntPipe) id: number) {
		return this.organizationService.removeDirection(id);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Post('services')
	createService(@Body() dto: CreateServiceDto) {
		return this.organizationService.createService(dto);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Patch('services/:id')
	renameService(@Param('id', ParseIntPipe) id: number, @Body() dto: RenameDto) {
		return this.organizationService.renameService(id, dto);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Delete('services/:id')
	@HttpCode(204)
	removeService(@Param('id', ParseIntPipe) id: number) {
		return this.organizationService.removeService(id);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Post('agents')
	createAgent(@Body() dto: CreateAgentDto) {
		return this.organizationService.createAgent(dto);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Patch('agents/:id')
	updateAgent(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAgentDto) {
		return this.organizationService.updateAgent(id, dto);
	}

	@Roles(RoleName.ADMINISTRATOR)
	@Delete('agents/:id')
	@HttpCode(204)
	removeAgent(@Param('id', ParseIntPipe) id: number) {
		return this.organizationService.removeAgent(id);
	}
}

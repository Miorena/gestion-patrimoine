import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // Reading is open to every authenticated user
  @Get()
  findAll(@Query() query: ListAssetsQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/history')
  findHistory(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findHistory(id);
  }

  @Roles(RoleName.ADMINISTRATOR, RoleName.MANAGER)
  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: JwtPayload) {
    return this.assetsService.create(dto, user.sub);
  }

  @Roles(RoleName.ADMINISTRATOR, RoleName.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetDto, @CurrentUser() user: JwtPayload) {
    return this.assetsService.update(id, dto, user.sub);
  }

  // Assumption: validation belongs to the supervisor (and the administrator)
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR)
  @Post(':id/validate-acquisition')
  @HttpCode(200)
  validateAcquisition(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.assetsService.validateAcquisition(id, user.sub);
  }
}

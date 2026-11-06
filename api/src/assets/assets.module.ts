import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LookupsModule } from '../lookups/lookups.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetEquipment } from './entities/asset-equipment.entity';
import { AssetHistory } from './entities/asset-history.entity';
import { AssetRealEstate } from './entities/asset-real-estate.entity';
import { Asset } from './entities/asset.entity';

@Module({
	imports: [
		LookupsModule,
		TypeOrmModule.forFeature([Asset, AssetEquipment, AssetRealEstate, AssetHistory]),
	],
	controllers: [AssetsController],
	providers: [AssetsService],
})
export class AssetsModule { }

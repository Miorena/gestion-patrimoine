import { Type } from 'class-transformer';
import {
	IsBoolean, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsNumber, IsOptional,
	IsPositive, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { AcquisitionMode } from '../entities/asset.entity';
import { RealEstateKind } from '../entities/asset-real-estate.entity';

export class EquipmentDto {
	@IsOptional() @IsString() @MaxLength(100)
	brand?: string;

	@IsOptional() @IsString() @MaxLength(100)
	model?: string;

	@IsOptional() @IsString() @MaxLength(100)
	serialNumber?: string;
}

export class RealEstateDto {
	@IsString() @IsNotEmpty() @MaxLength(255)
	address: string;

	@IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
	area: number;

	@IsOptional() @IsString() @MaxLength(100)
	cadastralReference?: string;

	@IsEnum(RealEstateKind)
	kind: RealEstateKind;
}

export class CreateAssetDto {
	@IsString() @IsNotEmpty() @MaxLength(200)
	designation: string;

	// Format YYYY-MM-DD
	@IsISO8601({ strict: true })
	acquisitionDate: string;

	@IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
	acquisitionValue: number;

	@IsEnum(AcquisitionMode)
	acquisitionMode: AcquisitionMode;

	@IsOptional() @IsBoolean()
	managedByLot?: boolean;

	@IsOptional() @IsInt() @Min(1)
	quantity?: number;

	@IsOptional() @IsString()
	notes?: string;

	@IsInt() categoryId: number;
	@IsInt() stateId: number;
	@IsInt() locationId: number;

	// Allowed only when the category family is 'equipement'
	@IsOptional() @ValidateNested() @Type(() => EquipmentDto)
	equipment?: EquipmentDto;

	// Required when the category family is 'immobilier'
	@IsOptional() @ValidateNested() @Type(() => RealEstateDto)
	realEstate?: RealEstateDto;
}

import { BadRequestException } from '@nestjs/common';
import { AssetFamily } from '../lookups/enums/asset-family.enum';
import { EquipmentDto, RealEstateDto } from './dto/create-asset.dto';

// Business rules checked by the service before writing (pure functions: no database access)

// Label of the "in service" state (RG04: only allowed once the acquisition is validated)
export const IN_SERVICE_LABEL = 'En service';

// Fields compared to build the history of an update
export const TRACKED_FIELDS = [
	'designation', 'acquisitionDate', 'acquisitionValue', 'acquisitionMode',
	'managedByLot', 'quantity', 'notes', 'categoryId', 'stateId', 'locationId',
] as const;

export function assertDateNotInFuture(date: string) {
	const today = new Date().toISOString().slice(0, 10);
	if (date > today) throw new BadRequestException('The acquisition date cannot be in the future');
}

// A standalone asset has quantity 1; real estate is never managed by lot
export function assertLotConsistency(family: AssetFamily, managedByLot: boolean, quantity: number) {
	if (family === AssetFamily.REAL_ESTATE && managedByLot) {
		throw new BadRequestException('Real estate cannot be managed by lot');
	}
	if (!managedByLot && quantity !== 1) {
		throw new BadRequestException('An asset not managed by lot must have a quantity of 1');
	}
}

// Extension must match category.family (equipment XOR real estate)
export function assertExtensionMatchesFamily(
	family: AssetFamily,
	equipment: EquipmentDto | undefined,
	realEstate: RealEstateDto | undefined,
	isCreation: boolean,
) {
	if (family === AssetFamily.EQUIPMENT && realEstate) {
		throw new BadRequestException('Real estate details are not allowed for an equipment category');
	}
	if (family === AssetFamily.REAL_ESTATE && equipment) {
		throw new BadRequestException('Equipment details are not allowed for a real estate category');
	}
	if (family === AssetFamily.REAL_ESTATE && isCreation && !realEstate) {
		throw new BadRequestException('Real estate details are required for this category');
	}
}

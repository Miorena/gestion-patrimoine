import { BadRequestException } from '@nestjs/common';
import { AssetFamily } from '../lookups/enums/asset-family.enum';
import { EquipmentDto, RealEstateDto } from './dto/create-asset.dto';

// Règles métier vérifiées par le service avant écriture (fonctions pures : aucun accès à la base)

// Libellé de l'état « en service » (RG04 : autorisé uniquement une fois l'acquisition validée)
export const IN_SERVICE_LABEL = 'En service';

// Champs comparés pour construire l'historique d'une modification
export const TRACKED_FIELDS = [
	'designation', 'acquisitionDate', 'acquisitionValue', 'acquisitionMode',
	'managedByLot', 'quantity', 'notes', 'categoryId', 'stateId', 'locationId',
] as const;

export function assertDateNotInFuture(date: string) {
	const today = new Date().toISOString().slice(0, 10);
	if (date > today) throw new BadRequestException('The acquisition date cannot be in the future');
}

// Un bien hors lot a une quantité de 1 ; l'immobilier n'est jamais géré par lot
export function assertLotConsistency(family: AssetFamily, managedByLot: boolean, quantity: number) {
	if (family === AssetFamily.REAL_ESTATE && managedByLot) {
		throw new BadRequestException('Real estate cannot be managed by lot');
	}
	if (!managedByLot && quantity !== 1) {
		throw new BadRequestException('An asset not managed by lot must have a quantity of 1');
	}
}

// L'extension doit correspondre à category.family (équipement XOR immobilier)
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

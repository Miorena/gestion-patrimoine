import { Category, Location, State } from './lookup.model';

export type RealEstateKind = 'batiment' | 'terrain';
export type AcquisitionMode = 'achat' | 'don_legs' | 'transfert_inter_service' | 'fabrication_interne';

export interface Equipment {
	brand: string | null;
	model: string | null;
	serialNumber: string | null;
}

export interface RealEstate {
	address: string;
	area: number;
	cadastralReference: string | null;
	kind: RealEstateKind;
}

export interface Asset {
	id: number;
	code: string;
	designation: string;
	acquisitionDate: string; // YYYY-MM-DD
	acquisitionValue: number;
	acquisitionMode: AcquisitionMode;
	acquisitionValidated: boolean;
	managedByLot: boolean;
	quantity: number;
	notes: string | null;
	categoryId: number;
	stateId: number;
	locationId: number;
	category: Category;
	state: State;
	location: Location;
	equipment: Equipment | null;
	realEstate: RealEstate | null;
}

// Corps envoyé à POST /assets et PATCH /assets/:id
export interface AssetPayload {
	designation: string;
	acquisitionDate: string;
	acquisitionValue: number;
	acquisitionMode: AcquisitionMode;
	managedByLot: boolean;
	quantity: number;
	notes: string | null;
	categoryId: number;
	stateId: number;
	locationId: number;
	equipment?: Equipment;
	realEstate?: RealEstate;
}

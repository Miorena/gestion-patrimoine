import { AcquisitionMode, RealEstateKind } from './models/asset.model';

// Même libellé que la règle RG04 de l'API
export const IN_SERVICE_LABEL = 'En service';

// Libellés français affichés dans l'interface
export const ACQUISITION_MODES: { value: AcquisitionMode; label: string }[] = [
	{ value: 'achat', label: 'Achat' },
	{ value: 'don_legs', label: 'Don / legs' },
	{ value: 'transfert_inter_service', label: 'Transfert inter-service' },
	{ value: 'fabrication_interne', label: 'Fabrication interne' },
];

export const REAL_ESTATE_KINDS: { value: RealEstateKind; label: string }[] = [
	{ value: 'batiment', label: 'Bâtiment' },
	{ value: 'terrain', label: 'Terrain' },
];

export const HISTORY_ACTIONS: Record<string, string> = {
	ASSET_CREATED: 'Création',
	ASSET_UPDATED: 'Modification',
	ACQUISITION_VALIDATED: "Validation de l'acquisition",
};

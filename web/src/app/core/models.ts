export type AssetFamily = 'equipement' | 'immobilier';
export type RealEstateKind = 'batiment' | 'terrain';
export type AcquisitionMode = 'achat' | 'don_legs' | 'transfert_inter_service' | 'fabrication_interne';

export interface Category { id: number; label: string; family: AssetFamily; }
export interface State { id: number; label: string; isFinal: boolean; }
export interface Location { id: number; name: string; type: string; parentId: number | null; }
export interface Lookups { categories: Category[]; states: State[]; locations: Location[]; }

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

// Body sent to POST /assets and PATCH /assets/:id
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

export interface Page<T> { items: T[]; total: number; page: number; limit: number; }

export interface HistoryEntry {
  id: number;
  createdAt: string;
  action: string;
  details: string | null;
  userName: string;
}

export interface UserProfile { id: number; name: string; email: string; role: string; }

// Role labels (same values as the database)
export const ROLE = {
  ADMINISTRATOR: 'Administrateur',
  MANAGER: 'Gestionnaire',
  SUPERVISOR: 'Responsable',
} as const;

// Same label as the API rule RG04
export const IN_SERVICE_LABEL = 'En service';

// French labels shown in the UI
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

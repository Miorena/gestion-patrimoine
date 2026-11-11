export type AssetFamily = 'equipement' | 'immobilier';

export interface Category { id: number; label: string; family: AssetFamily; }
export interface State { id: number; label: string; isFinal: boolean; }
export interface Location { id: number; name: string; type: string; parentId: number | null; }
export interface Lookups { categories: Category[]; states: State[]; locations: Location[]; }

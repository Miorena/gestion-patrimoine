export interface HistoryEntry {
	id: number;
	createdAt: string;
	action: string;
	details: string | null;
	userName: string;
}

// Entrée de l'historique global : l'événement + le bien concerné
export interface GlobalHistoryEntry extends HistoryEntry {
	assetId: number;
	assetCode: string;
	assetDesignation: string;
}

export type HistorySortKey = 'date' | 'action' | 'asset' | 'user';

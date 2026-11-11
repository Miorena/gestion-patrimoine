export interface HistoryEntry {
	id: number;
	createdAt: string;
	action: string;
	details: string | null;
	userName: string;
}

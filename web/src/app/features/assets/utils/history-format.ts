import { ACQUISITION_MODES, HISTORY_ACTIONS } from '../asset.constants';
import { HistoryEntry } from '../models/history.model';
import { Lookups } from '../models/lookup.model';

export interface HistoryChange {
	label: string;
	from: string | null; // null: no "before" value to show (the arrow is hidden)
	fromEmpty: boolean; // the old value was empty: shown as "vide" in italics, not struck through
	to: string;
	toEmpty: boolean;
}

export interface HistoryView {
	id: number;
	createdAt: string;
	action: string;
	actionLabel: string;
	userName: string;
	changes: HistoryChange[]; // readable list of modified fields
	text: string | null; // plain text when there is nothing to list (e.g. "Code PAT-2026-00003")
}

const FIELD_LABELS: Record<string, string> = {
	designation: 'Désignation',
	acquisitionDate: "Date d'acquisition",
	acquisitionValue: "Valeur d'acquisition",
	acquisitionMode: "Mode d'acquisition",
	managedByLot: 'Gestion par lot',
	quantity: 'Quantité',
	notes: 'Observations',
	categoryId: 'Catégorie',
	stateId: 'État',
	locationId: 'Localisation',
	extension: 'Caractéristiques spécifiques',
};

const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Turns the raw value stored in the history into text a user can read
const EMPTY_TEXT = 'vide';

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === '';
}

function formatValue(field: string, value: unknown, lookups: Lookups | null): string {
	if (isEmpty(value)) return EMPTY_TEXT;
	switch (field) {
		case 'acquisitionDate': {
			const [year, month, day] = String(value).split('-');
			return day ? `${day}/${month}/${year}` : String(value);
		}
		case 'acquisitionValue':
			return NUMBER_FORMAT.format(Number(value));
		case 'acquisitionMode':
			return ACQUISITION_MODES.find((mode) => mode.value === value)?.label ?? String(value);
		case 'managedByLot':
			return value ? 'Oui' : 'Non';
		case 'categoryId':
			return lookups?.categories.find((c) => c.id === value)?.label ?? `#${value}`;
		case 'stateId':
			return lookups?.states.find((s) => s.id === value)?.label ?? `#${value}`;
		case 'locationId':
			return lookups?.locations.find((l) => l.id === value)?.name ?? `#${value}`;
		default:
			return String(value);
	}
}

function parseChanges(details: string | null, lookups: Lookups | null): HistoryChange[] {
	if (!details) return [];
	try {
		const parsed = JSON.parse(details) as Record<string, [unknown, unknown]>;
		return Object.entries(parsed).map(([field, pair]) =>
			field === 'extension'
				? { label: FIELD_LABELS[field], from: null, fromEmpty: false, to: 'Modifiées', toEmpty: false }
				: {
					label: FIELD_LABELS[field] ?? field,
					from: formatValue(field, pair[0], lookups),
					fromEmpty: isEmpty(pair[0]),
					to: formatValue(field, pair[1], lookups),
					toEmpty: isEmpty(pair[1]),
				},
		);
	} catch {
		return []; // not JSON: shown as plain text
	}
}

export function toHistoryView(entry: HistoryEntry, lookups: Lookups | null): HistoryView {
	const changes = entry.action === 'ASSET_UPDATED' ? parseChanges(entry.details, lookups) : [];
	return {
		id: entry.id,
		createdAt: entry.createdAt,
		action: entry.action,
		actionLabel: HISTORY_ACTIONS[entry.action] ?? entry.action,
		userName: entry.userName,
		changes,
		text: changes.length === 0 ? entry.details : null,
	};
}

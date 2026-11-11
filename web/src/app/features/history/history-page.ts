import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { errorMessage } from '../../core/http/http-error';
import { HISTORY_ACTIONS } from '../assets/asset.constants';
import { AssetsService } from '../assets/assets.service';
import { GlobalHistoryEntry, HistorySortKey } from '../assets/models/history.model';
import { Lookups } from '../assets/models/lookup.model';
import { HistoryView, toHistoryView } from '../assets/utils/history-format';

const PAGE_SIZE = 15;

interface HistoryRow extends HistoryView {
	assetCode: string;
	assetDesignation: string;
}

@Component({
	selector: 'app-history-page',
	imports: [ReactiveFormsModule, DatePipe],
	templateUrl: './history-page.html',
})
export class HistoryPage {
	private readonly assetsService = inject(AssetsService);

	protected readonly search = new FormControl('', { nonNullable: true });
	protected readonly action = new FormControl('', { nonNullable: true });
	protected readonly actions = Object.entries(HISTORY_ACTIONS).map(([value, label]) => ({ value, label }));

	protected readonly sort = signal<HistorySortKey>('date');
	protected readonly order = signal<'ASC' | 'DESC'>('DESC'); // les événements les plus récents d'abord

	private readonly lookups = signal<Lookups | null>(null);
	private readonly entries = signal<GlobalHistoryEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly page = signal(1);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

	// Les valeurs (catégorie, état, localisation) sont affichées en texte lisible grâce aux listes de référence
	protected readonly rows = computed<HistoryRow[]>(() =>
		this.entries().map((entry) => ({
			...toHistoryView(entry, this.lookups()),
			assetCode: entry.assetCode,
			assetDesignation: entry.assetDesignation,
		})),
	);

	constructor() {
		this.assetsService.lookups().subscribe({ next: (lookups) => this.lookups.set(lookups) });

		this.search.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
		this.action.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applyFilters());

		this.load();
	}

	protected sortBy(key: HistorySortKey) {
		if (this.sort() === key) {
			this.order.update((order) => (order === 'ASC' ? 'DESC' : 'ASC'));
		} else {
			this.sort.set(key);
			// Par défaut : les dates du plus récent au plus ancien, le reste de A à Z
			this.order.set(key === 'date' ? 'DESC' : 'ASC');
		}
		this.page.set(1);
		this.load();
	}

	protected ariaSort(key: HistorySortKey): 'ascending' | 'descending' | 'none' {
		if (this.sort() !== key) return 'none';
		return this.order() === 'ASC' ? 'ascending' : 'descending';
	}

	protected goTo(page: number) {
		this.page.set(page);
		this.load();
	}

	protected dotClass(action: string) {
		if (action === 'ASSET_CREATED') return 'dot-create';
		if (action === 'ACQUISITION_VALIDATED') return 'dot-valid';
		return 'dot-update';
	}

	private applyFilters() {
		this.page.set(1);
		this.load();
	}

	private load() {
		this.loading.set(true);
		this.assetsService
			.globalHistory({
				page: this.page(),
				limit: PAGE_SIZE,
				search: this.search.value.trim(),
				action: this.action.value || undefined,
				sort: this.sort(),
				order: this.order(),
			})
			.subscribe({
				next: (result) => {
					this.entries.set(result.items);
					this.total.set(result.total);
					this.error.set(null);
					this.loading.set(false);
				},
				error: (error) => {
					this.error.set(errorMessage(error));
					this.loading.set(false);
				},
			});
	}
}

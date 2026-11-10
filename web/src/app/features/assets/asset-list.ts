import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, merge } from 'rxjs';
import { AssetsService } from '../../core/assets.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { Asset, Lookups, ROLE } from '../../core/models';
import { stateClass } from '../../core/state-style';
import { ToastService } from '../../core/toast.service';
import { AssetPanel, PanelMode } from './asset-panel';

// Hauteur d'une ligne de la liste (56 px) et espace entre deux lignes (2 px) : voir .asset-item dans styles.css
const ROW_HEIGHT = 56;
const ROW_GAP = 2;
const MIN_ROWS = 4;

@Component({
	selector: 'app-asset-list',
	imports: [ReactiveFormsModule, DecimalPipe, AssetPanel],
	templateUrl: './asset-list.html',
})
export class AssetList {
	private readonly assetsService = inject(AssetsService);
	private readonly auth = inject(AuthService);
	private readonly toast = inject(ToastService);

	private readonly destroyRef = inject(DestroyRef);
	private readonly listScroll = viewChild<ElementRef<HTMLElement>>('listScroll');
	private sized = false; // la taille de page n'est connue qu'après la première mesure de la liste

	protected readonly search = new FormControl('', { nonNullable: true });
	protected readonly categoryId = new FormControl<number | null>(null);
	protected readonly stateId = new FormControl<number | null>(null);

	protected readonly lookups = signal<Lookups | null>(null);
	protected readonly assets = signal<Asset[]>([]);
	protected readonly total = signal(0);
	protected readonly page = signal(1);
	protected readonly pageSize = signal(10); // nombre de lignes qui tiennent dans la fenêtre
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	// Ce que montre le panneau de droite : le bien sélectionné (lecture / modification) ou un formulaire vide
	protected readonly selectedId = signal<number | null>(null);
	protected readonly mode = signal<PanelMode>('view');

	protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
	protected readonly canCreate = this.auth.hasRole(ROLE.ADMINISTRATOR, ROLE.MANAGER);
	protected readonly stateClass = stateClass;

	constructor() {
		this.assetsService.lookups().subscribe({
			next: (lookups) => this.lookups.set(lookups),
			error: (error) => this.error.set(errorMessage(error)),
		});

		// La saisie dans la recherche recharge après une courte pause ; les deux listes rechargent aussitôt
		this.search.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
		merge(this.categoryId.valueChanges, this.stateId.valueChanges)
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.applyFilters());

		// Le premier chargement attend la mesure de la liste, pour demander juste ce qui tient à l'écran
		afterNextRender(() => this.watchListHeight());
	}

	protected select(id: number) {
		if (this.mode() !== 'view') {
			this.toast.info('Terminez ou annulez la saisie en cours avant de changer de bien.');
			return;
		}
		this.selectedId.set(id);
	}

	protected startCreate() {
		this.selectedId.set(null);
		this.mode.set('create');
	}

	protected cancel() {
		// Annuler une création réaffiche la première ligne de la liste
		if (this.mode() === 'create') this.selectedId.set(this.assets()[0]?.id ?? null);
		this.mode.set('view');
	}

	protected onSaved(asset: Asset) {
		const created = this.mode() === 'create';
		this.mode.set('view');
		this.selectedId.set(asset.id);
		if (created) this.page.set(1); // le nouveau bien est tout en haut de la liste
		this.load();
	}

	protected applyFilters() {
		this.page.set(1);
		this.load();
	}

	protected goTo(page: number) {
		this.page.set(page);
		this.load();
	}

	// Adapte le nombre de lignes par page à la hauteur de la fenêtre : la liste ne défile jamais
	private watchListHeight() {
		const element = this.listScroll()?.nativeElement;
		if (!element) {
			this.load();
			return;
		}
		const observer = new ResizeObserver(() => this.fitPageSize(element));
		observer.observe(element);
		this.destroyRef.onDestroy(() => observer.disconnect());
	}

	private fitPageSize(element: HTMLElement) {
		const style = getComputedStyle(element);
		const inner = element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		const rows = Math.max(MIN_ROWS, Math.floor((inner + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)));

		if (!this.sized) {
			this.sized = true;
			this.pageSize.set(rows);
			this.load();
			return;
		}
		if (rows === this.pageSize()) return;

		// On garde le même premier bien à l'écran quand la fenêtre est redimensionnée
		const firstIndex = (this.page() - 1) * this.pageSize();
		this.pageSize.set(rows);
		this.page.set(Math.floor(firstIndex / rows) + 1);
		this.load();
	}

	private load() {
		this.loading.set(true);
		this.assetsService
			.list({
				page: this.page(),
				limit: this.pageSize(),
				search: this.search.value.trim(),
				categoryId: this.categoryId.value,
				stateId: this.stateId.value,
			})
			.subscribe({
				next: (result) => {
					this.assets.set(result.items);
					this.total.set(result.total);
					this.error.set(null);
					this.loading.set(false);
					// À l'arrivée, la première ligne est affichée dans le panneau
					if (this.selectedId() === null && this.mode() === 'view' && result.items.length > 0) {
						this.selectedId.set(result.items[0].id);
					}
				},
				error: (error) => {
					this.error.set(errorMessage(error));
					this.loading.set(false);
				},
			});
	}
}
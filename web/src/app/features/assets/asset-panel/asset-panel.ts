import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssetsService } from '../assets.service';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/http-error';
import { toHistoryView } from '../utils/history-format';
import { ACQUISITION_MODES, IN_SERVICE_LABEL, REAL_ESTATE_KINDS } from '../asset.constants';
import { AcquisitionMode, Asset, AssetPayload, RealEstateKind } from '../models/asset.model';
import { AssetFamily, Lookups } from '../models/lookup.model';
import { HistoryEntry } from '../models/history.model';
import { ROLE } from '../../../core/auth/auth.models';
import { stateClass } from '../utils/state-style';
import { ToastService } from '../../../core/toast/toast.service';

export type PanelMode = 'view' | 'edit' | 'create';

@Component({
	selector: 'app-asset-panel',
	imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
	templateUrl: './asset-panel.html',
})
export class AssetPanel {
	private readonly assetsService = inject(AssetsService);
	private readonly auth = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly fb = inject(NonNullableFormBuilder);

	// Piloté par la page parente
	readonly assetId = input<number | null>(null);
	readonly mode = input<PanelMode>('view');
	readonly lookups = input<Lookups | null>(null);

	readonly editRequested = output<void>();
	readonly cancelled = output<void>();
	readonly saved = output<Asset>();

	protected readonly acquisitionModes = ACQUISITION_MODES;
	protected readonly realEstateKinds = REAL_ESTATE_KINDS;
	protected readonly inServiceLabel = IN_SERVICE_LABEL;
	protected readonly today = new Date().toISOString().slice(0, 10);
	protected readonly stateClass = stateClass;

	protected readonly asset = signal<Asset | null>(null);
	protected readonly history = signal<HistoryEntry[]>([]);
	protected readonly family = signal<AssetFamily | null>(null); // famille choisie dans le formulaire
	protected readonly tab = signal<'info' | 'history'>('info');
	protected readonly loading = signal(false);
	protected readonly saving = signal(false);
	protected readonly busy = signal(false); // validation de l'acquisition en cours
	protected readonly error = signal<string | null>(null);

	protected readonly editing = computed(() => this.mode() !== 'view');
	protected readonly canEdit = this.auth.hasRole(ROLE.ADMINISTRATOR, ROLE.MANAGER);
	protected readonly canValidate = computed(
		() => this.auth.hasRole(ROLE.ADMINISTRATOR, ROLE.SUPERVISOR) && this.asset()?.acquisitionValidated === false,
	);

	// Famille qui décide du bloc affiché : le choix du formulaire en modification, celle du bien sinon
	protected readonly displayFamily = computed<AssetFamily | null>(() =>
		this.editing() ? this.family() : (this.asset()?.category.family ?? null),
	);

	// Modification : seulement les catégories de la même famille. Les états finaux passent par la sortie.
	protected readonly categoryOptions = computed(() => {
		const categories = this.lookups()?.categories ?? [];
		const asset = this.asset();
		return this.mode() === 'edit' && asset ? categories.filter((c) => c.family === asset.category.family) : categories;
	});
	protected readonly stateOptions = computed(() => (this.lookups()?.states ?? []).filter((s) => !s.isFinal));
	// « En service » est bloqué tant que l'acquisition n'est pas validée (règle RG04 de l'API)
	protected readonly inServiceLocked = computed(() => this.mode() === 'create' || !this.asset()?.acquisitionValidated);

	protected readonly modeLabel = computed(
		() => ACQUISITION_MODES.find((m) => m.value === this.asset()?.acquisitionMode)?.label,
	);
	protected readonly kindLabel = computed(
		() => REAL_ESTATE_KINDS.find((k) => k.value === this.asset()?.realEstate?.kind)?.label,
	);
	protected readonly historyView = computed(() =>
		this.history().map((entry) => toHistoryView(entry, this.lookups())),
	);

	protected readonly form = this.fb.group({
		designation: ['', [Validators.required, Validators.maxLength(200)]],
		categoryId: this.fb.control<number | null>(null, Validators.required),
		stateId: this.fb.control<number | null>(null, Validators.required),
		locationId: this.fb.control<number | null>(null, Validators.required),
		acquisitionDate: ['', Validators.required],
		acquisitionValue: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
		acquisitionMode: this.fb.control<AcquisitionMode>('achat'),
		managedByLot: [false],
		quantity: [1, [Validators.required, Validators.min(1)]],
		notes: [''],
		equipment: this.fb.group({ brand: [''], model: [''], serialNumber: [''] }),
		realEstate: this.fb.group({
			address: ['', Validators.required],
			area: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
			kind: this.fb.control<RealEstateKind>('batiment'),
			cadastralReference: [''],
		}),
	});

	constructor() {
		this.form.controls.quantity.disable(); // uniquement pour les lots

		// Un lot a une quantité libre, sinon elle vaut toujours 1
		this.form.controls.managedByLot.valueChanges.pipe(takeUntilDestroyed()).subscribe((isLot) => {
			const quantity = this.form.controls.quantity;
			if (isLot) quantity.enable();
			else {
				quantity.setValue(1);
				quantity.disable();
			}
		});

		// La catégorie décide du bloc affiché (équipement / immobilier)
		this.form.controls.categoryId.valueChanges.pipe(takeUntilDestroyed()).subscribe((categoryId) => {
			const category = this.lookups()?.categories.find((c) => c.id === categoryId);
			this.applyFamily(category?.family ?? null);
		});

		// Charge le bien à chaque changement de sélection
		effect(() => {
			const id = this.assetId();
			untracked(() => this.loadFor(id));
		});

		// Prépare le formulaire à chaque changement de mode (lecture → modification / création)
		effect(() => {
			const mode = this.mode();
			untracked(() => this.prepare(mode));
		});
	}

	protected save() {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		const creating = this.mode() === 'create';
		const current = this.asset();
		if (!creating && !current) return;

		this.saving.set(true);
		this.error.set(null);
		const payload = this.buildPayload();
		const request = creating ? this.assetsService.create(payload) : this.assetsService.update(current!.id, payload);

		request.subscribe({
			next: (asset) => {
				this.saving.set(false);
				this.asset.set(asset); // déjà complet : inutile de le recharger
				this.loadHistory(asset.id);
				this.toast.success(
					creating
						? `Bien « ${asset.designation} » ajouté (${asset.code}).`
						: `Bien « ${asset.designation} » modifié avec succès.`,
				);
				this.saved.emit(asset);
			},
			error: (error) => {
				this.error.set(errorMessage(error));
				this.saving.set(false);
			},
		});
	}

	protected validate() {
		const current = this.asset();
		if (!current) return;
		this.busy.set(true);
		this.assetsService.validateAcquisition(current.id).subscribe({
			next: (asset) => {
				this.asset.set(asset);
				this.error.set(null);
				this.busy.set(false);
				this.toast.success('Acquisition validée.');
				this.loadHistory(asset.id);
			},
			error: (error) => {
				this.error.set(errorMessage(error));
				this.busy.set(false);
			},
		});
	}

	protected dotClass(action: string) {
		if (action === 'ASSET_CREATED') return 'dot-create';
		if (action === 'ACQUISITION_VALIDATED') return 'dot-valid';
		return 'dot-update';
	}

	private loadFor(id: number | null) {
		this.error.set(null);
		if (id === null) {
			this.asset.set(null);
			this.history.set([]);
			return;
		}
		if (this.asset()?.id === id) return; // déjà chargé (par exemple juste après une création)

		this.asset.set(null);
		this.history.set([]);
		this.loading.set(true);
		this.assetsService.get(id).subscribe({
			next: (asset) => {
				if (this.assetId() !== id) return; // un autre bien a été sélectionné entre-temps
				this.asset.set(asset);
				this.loading.set(false);
			},
			error: (error) => {
				this.error.set(errorMessage(error));
				this.loading.set(false);
			},
		});
		this.loadHistory(id);
	}

	private loadHistory(id: number) {
		this.assetsService.history(id).subscribe({
			next: (entries) => {
				if (this.assetId() === id || this.asset()?.id === id) this.history.set(entries);
			},
			error: () => this.history.set([]),
		});
	}

	private prepare(mode: PanelMode) {
		this.error.set(null);
		if (mode === 'view') return;
		this.tab.set('info');
		if (mode === 'create') this.resetForCreate();
		else {
			const asset = this.asset();
			if (asset) this.fillFrom(asset);
		}
	}

	// Création : tous les champs sont vides (sauf l'état par défaut)
	private resetForCreate() {
		this.applyFamily(null);
		this.form.reset({
			designation: '',
			categoryId: null,
			stateId: this.lookups()?.states.find((s) => !s.isFinal)?.id ?? null,
			locationId: null,
			acquisitionDate: '',
			acquisitionValue: null,
			acquisitionMode: 'achat',
			managedByLot: false,
			quantity: 1,
			notes: '',
			equipment: { brand: '', model: '', serialNumber: '' },
			realEstate: { address: '', area: null, kind: 'batiment', cadastralReference: '' },
		});
	}

	// Modification : le formulaire démarre avec les valeurs actuelles du bien
	private fillFrom(asset: Asset) {
		this.applyFamily(asset.category.family);
		this.form.patchValue({
			designation: asset.designation,
			categoryId: asset.categoryId,
			stateId: asset.stateId,
			locationId: asset.locationId,
			acquisitionDate: asset.acquisitionDate,
			acquisitionValue: asset.acquisitionValue,
			acquisitionMode: asset.acquisitionMode,
			managedByLot: asset.managedByLot,
			quantity: asset.quantity,
			notes: asset.notes ?? '',
			equipment: {
				brand: asset.equipment?.brand ?? '',
				model: asset.equipment?.model ?? '',
				serialNumber: asset.equipment?.serialNumber ?? '',
			},
			realEstate: asset.realEstate
				? { ...asset.realEstate, cadastralReference: asset.realEstate.cadastralReference ?? '' }
				: {},
		});
		this.form.markAsPristine();
		this.form.markAsUntouched();
	}

	// Les groupes désactivés sont ignorés par la validation
	private applyFamily(family: AssetFamily | null) {
		this.family.set(family);
		const { equipment, realEstate, managedByLot } = this.form.controls;
		if (family === 'immobilier') {
			realEstate.enable();
			equipment.disable();
			managedByLot.setValue(false);
			managedByLot.disable(); // un bien immobilier n'est jamais géré par lot
		} else {
			equipment.enable();
			realEstate.disable();
			managedByLot.enable();
		}
	}

	private buildPayload(): AssetPayload {
		const v = this.form.getRawValue();
		const text = (value: string) => value.trim() || null; // texte vide → null

		const payload: AssetPayload = {
			designation: v.designation.trim(),
			acquisitionDate: v.acquisitionDate,
			acquisitionValue: Number(v.acquisitionValue),
			acquisitionMode: v.acquisitionMode,
			managedByLot: v.managedByLot,
			quantity: v.managedByLot ? Number(v.quantity) : 1,
			notes: text(v.notes),
			categoryId: v.categoryId!,
			stateId: v.stateId!,
			locationId: v.locationId!,
		};

		if (this.family() === 'immobilier') {
			const r = v.realEstate;
			payload.realEstate = {
				address: r.address.trim(),
				area: Number(r.area),
				kind: r.kind,
				cadastralReference: text(r.cadastralReference),
			};
		} else {
			const e = v.equipment;
			payload.equipment = { brand: text(e.brand), model: text(e.model), serialNumber: text(e.serialNumber) };
		}
		return payload;
	}
}
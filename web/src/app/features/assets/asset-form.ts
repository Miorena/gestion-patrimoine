import { Component, OnInit, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AssetsService } from '../../core/assets.service';
import { errorMessage } from '../../core/http-error';
import {
	ACQUISITION_MODES, AcquisitionMode, Asset, AssetFamily, AssetPayload, IN_SERVICE_LABEL,
	Lookups, REAL_ESTATE_KINDS, RealEstateKind,
} from '../../core/models';

@Component({
	selector: 'app-asset-form',
	imports: [ReactiveFormsModule, RouterLink],
	templateUrl: './asset-form.html',
})
export class AssetForm implements OnInit {
	private readonly assetsService = inject(AssetsService);
	private readonly router = inject(Router);
	private readonly fb = inject(NonNullableFormBuilder);

	// Route parameter :id (absent on /assets/new → creation mode)
	readonly id = input(undefined, { transform: (value: unknown) => (value == null ? undefined : numberAttribute(value)) });

	protected readonly acquisitionModes = ACQUISITION_MODES;
	protected readonly realEstateKinds = REAL_ESTATE_KINDS;
	protected readonly today = new Date().toISOString().slice(0, 10);

	protected readonly lookups = signal<Lookups | null>(null);
	protected readonly asset = signal<Asset | null>(null); // set in edit mode
	protected readonly family = signal<AssetFamily | null>(null);
	protected readonly saving = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly isEdit = computed(() => this.id() !== undefined);

	// Edit mode: only categories of the same family; final states are set by the exit process
	protected readonly categoryOptions = computed(() => {
		const categories = this.lookups()?.categories ?? [];
		const asset = this.asset();
		return asset ? categories.filter((c) => c.family === asset.category.family) : categories;
	});
	protected readonly stateOptions = computed(() => (this.lookups()?.states ?? []).filter((s) => !s.isFinal));
	// "In service" is locked until the acquisition is validated (API rule RG04)
	protected readonly inServiceLocked = computed(() => !this.asset()?.acquisitionValidated);
	protected readonly inServiceLabel = IN_SERVICE_LABEL;

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
		this.form.controls.quantity.disable(); // only for lots

		// A lot has a free quantity, otherwise it is always 1
		this.form.controls.managedByLot.valueChanges.pipe(takeUntilDestroyed()).subscribe((isLot) => {
			const quantity = this.form.controls.quantity;
			if (isLot) quantity.enable();
			else {
				quantity.setValue(1);
				quantity.disable();
			}
		});

		// The category decides which extension block is shown (equipment / real estate)
		this.form.controls.categoryId.valueChanges.pipe(takeUntilDestroyed()).subscribe((categoryId) => {
			const category = this.lookups()?.categories.find((c) => c.id === categoryId);
			this.applyFamily(category?.family ?? null);
		});

	}

	// The route parameter (:id) is only available from ngOnInit, not in the constructor.
	// The lookups are now cached and can answer immediately, so reading the id here is required.
	ngOnInit() {
		this.assetsService.lookups().subscribe({
			next: (lookups) => {
				this.lookups.set(lookups);
				const id = this.id();
				if (id !== undefined) this.loadAsset(id);
				else this.form.patchValue({ stateId: lookups.states.find((s) => !s.isFinal)?.id ?? null });
			},
			error: (error) => this.error.set(errorMessage(error)),
		});
	}

	protected submit() {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		this.saving.set(true);
		this.error.set(null);

		const payload = this.buildPayload();
		const id = this.id();
		const request = id !== undefined ? this.assetsService.update(id, payload) : this.assetsService.create(payload);

		request.subscribe({
			next: (asset) => this.router.navigate(['/assets', asset.id]),
			error: (error) => {
				this.error.set(errorMessage(error));
				this.saving.set(false);
			},
		});
	}

	private loadAsset(id: number) {
		this.assetsService.get(id).subscribe({
			next: (asset) => {
				this.asset.set(asset);
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
			},
			error: (error) => this.error.set(errorMessage(error)),
		});
	}

	// Disabled groups are ignored by validation
	private applyFamily(family: AssetFamily | null) {
		this.family.set(family);
		const { equipment, realEstate, managedByLot } = this.form.controls;
		if (family === 'immobilier') {
			realEstate.enable();
			equipment.disable();
			managedByLot.setValue(false);
			managedByLot.disable(); // real estate is never managed by lot
		} else {
			equipment.enable();
			realEstate.disable();
			managedByLot.enable();
		}
	}

	private buildPayload(): AssetPayload {
		const v = this.form.getRawValue();
		const text = (value: string) => value.trim() || null; // empty text → null

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

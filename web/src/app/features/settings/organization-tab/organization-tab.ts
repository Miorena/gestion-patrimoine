import { Component, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/http/http-error';
import { ToastService } from '../../../core/toast/toast.service';
import { OrganizationService } from '../organization.service';
import { Agent, Direction, OrgService } from '../settings.models';

// Élément en attente de confirmation de suppression
interface PendingDelete {
	kind: 'direction' | 'service' | 'agent';
	id: number;
	label: string;
}

@Component({
	selector: 'app-organization-tab',
	imports: [ReactiveFormsModule, FormsModule],
	templateUrl: './organization-tab.html',
})
export class OrganizationTab {
	private readonly organization = inject(OrganizationService);
	private readonly toast = inject(ToastService);

	protected readonly directions = signal<Direction[]>([]);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly busy = signal(false);

	// Parties dépliées (par identifiant) : tout est replié au départ
	protected readonly openDirections = signal<ReadonlySet<number>>(new Set());
	protected readonly openServices = signal<ReadonlySet<number>>(new Set());

	// Un seul formulaire d'ajout ouvert à la fois : « direction », « service-<id direction> » ou « agent-<id service> »
	protected readonly adding = signal<string | null>(null);
	protected readonly pendingDelete = signal<PendingDelete | null>(null);

	protected readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] });
	protected readonly lastName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] });
	protected readonly firstName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] });
	protected readonly position = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] });

	constructor() {
		this.load();
	}

	// ---------- Dépliage ----------

	protected toggleDirection(id: number) {
		this.openDirections.update((set) => this.toggled(set, id));
	}

	protected toggleService(id: number) {
		this.openServices.update((set) => this.toggled(set, id));
	}

	// ---------- Ajout ----------

	protected startAdding(key: string) {
		this.name.reset();
		this.lastName.reset();
		this.firstName.reset();
		this.position.reset();
		this.adding.set(key);
	}

	protected cancelAdding() {
		this.adding.set(null);
	}

	protected addDirection() {
		if (this.name.invalid) return this.name.markAsTouched();
		this.run(this.organization.createDirection(this.name.value.trim()), 'Direction ajoutée.');
	}

	protected addService(direction: Direction) {
		if (this.name.invalid) return this.name.markAsTouched();
		this.run(this.organization.createService(this.name.value.trim(), direction.id), 'Service ajouté.', () =>
			this.openDirections.update((set) => new Set(set).add(direction.id)),
		);
	}

	protected addAgent(service: OrgService) {
		if (this.lastName.invalid || this.firstName.invalid || this.position.invalid) {
			this.lastName.markAsTouched();
			this.firstName.markAsTouched();
			return;
		}
		this.run(
			this.organization.createAgent({
				lastName: this.lastName.value.trim(),
				firstName: this.firstName.value.trim(),
				position: this.position.value.trim(),
				serviceId: service.id,
			}),
			'Agent ajouté.',
			() => this.openServices.update((set) => new Set(set).add(service.id)),
		);
	}

	// ---------- Suppression (avec confirmation) ----------

	protected askDelete(kind: PendingDelete['kind'], id: number, label: string) {
		this.pendingDelete.set({ kind, id, label });
	}

	protected cancelDelete() {
		this.pendingDelete.set(null);
	}

	protected confirmDelete() {
		const target = this.pendingDelete();
		if (!target) return;
		const request =
			target.kind === 'direction'
				? this.organization.removeDirection(target.id)
				: target.kind === 'service'
					? this.organization.removeService(target.id)
					: this.organization.removeAgent(target.id);
		this.pendingDelete.set(null);
		this.run(request, 'Supprimé.');
	}

	protected agentName(agent: Agent) {
		return `${agent.firstName} ${agent.lastName}`;
	}

	// ---------- Utilitaires ----------

	// Exécute un ajout / une suppression puis recharge l'arbre ; les erreurs de l'API (doublon, élément utilisé…) sont affichées telles quelles
	private run(request: Observable<unknown>, successMessage: string, onSuccess?: () => void) {
		this.busy.set(true);
		request.subscribe({
			next: () => {
				this.busy.set(false);
				this.adding.set(null);
				onSuccess?.();
				this.toast.success(successMessage);
				this.load();
			},
			error: (error) => {
				this.busy.set(false);
				this.toast.error(errorMessage(error));
			},
		});
	}

	private toggled(set: ReadonlySet<number>, id: number) {
		const next = new Set(set);
		if (!next.delete(id)) next.add(id);
		return next;
	}

	private load() {
		this.loading.set(true);
		this.organization.tree().subscribe({
			next: (directions) => {
				this.directions.set(directions);
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

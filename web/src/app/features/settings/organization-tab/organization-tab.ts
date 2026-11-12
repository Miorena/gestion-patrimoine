import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/http/http-error';
import { ToastService } from '../../../core/toast/toast.service';
import { OrganizationService } from '../organization.service';
import { Agent, AgentPayload, Direction, OrgService } from '../settings.models';

// Élément en attente de confirmation de suppression
interface PendingDelete {
	kind: 'direction' | 'service' | 'agent';
	id: number;
	label: string;
}

// Direction ou service en cours de renommage
interface RenameTarget {
	kind: 'direction' | 'service';
	id: number;
}

// Retire les accents et la casse pour que la recherche trouve « Électricien » en tapant « electricien »
const normalize = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();

const agentFullName = (agent: Agent) => `${agent.firstName} ${agent.lastName}`;

@Component({
	selector: 'app-organization-tab',
	// FormsModule apporte (ngSubmit) aux <form> sans [formGroup] ; sans lui, le formulaire recharge la page
	imports: [ReactiveFormsModule, FormsModule],
	templateUrl: './organization-tab.html',
	host: { '(document:keydown.escape)': 'closeOverlays()' },
})
export class OrganizationTab {
	private readonly organization = inject(OrganizationService);
	private readonly toast = inject(ToastService);

	protected readonly directions = signal<Direction[]>([]);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly busy = signal(false); // une requête est en cours : les boutons d'enregistrement sont grisés

	// Service affiché dans la colonne de droite
	protected readonly selectedId = signal<number | null>(null);

	// Recherche dans la structure (colonne de gauche) et dans les agents (colonne de droite)
	protected readonly query = signal('');
	protected readonly agentQuery = signal('');

	// Formulaires d'ajout ouverts dans la colonne de gauche
	protected readonly addingDirection = signal(false);
	protected readonly addingServiceIn = signal<number | null>(null); // id de la direction concernée

	// Fenêtres : renommage, suppression à confirmer et panneau latéral de l'agent
	protected readonly renaming = signal<RenameTarget | null>(null);
	protected readonly pendingDelete = signal<PendingDelete | null>(null);
	protected readonly drawer = signal<{ agent: Agent | null } | null>(null); // agent null : création

	protected readonly directionName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] });
	protected readonly serviceName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] });
	protected readonly renameName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] });
	protected readonly agentForm = new FormGroup({
		lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
		firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
		position: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] }),
		serviceId: new FormControl<number | null>(null, { validators: [Validators.required] }),
	});

	// Tous les services avec le nom de leur direction (liste déroulante pour déplacer un agent)
	protected readonly serviceOptions = computed(() =>
		this.directions().flatMap((direction) =>
			direction.services.map((service) => ({ id: service.id, label: `${direction.name} › ${service.name}` })),
		),
	);

	// Le service choisi et sa direction
	protected readonly selected = computed(() => {
		const id = this.selectedId();
		for (const direction of this.directions()) {
			const service = direction.services.find((item) => item.id === id);
			if (service) return { direction, service };
		}
		return null;
	});

	protected readonly summary = computed(() => {
		const directions = this.directions();
		const services = directions.reduce((total, direction) => total + direction.services.length, 0);
		const agents = directions.reduce(
			(total, direction) => total + direction.services.reduce((sum, service) => sum + service.agents.length, 0),
			0,
		);
		return `${directions.length} direction(s) · ${services} service(s) · ${agents} agent(s)`;
	});

	// Colonne de gauche filtrée : on garde un service si son nom ou un de ses agents correspond, une direction si son nom correspond
	protected readonly visibleDirections = computed(() => {
		const query = normalize(this.query().trim());
		if (!query) return this.directions();
		return this.directions()
			.map((direction) => {
				if (normalize(direction.name).includes(query)) return direction;
				const services = direction.services.filter(
					(service) =>
						normalize(service.name).includes(query) ||
						service.agents.some((agent) => normalize(agentFullName(agent)).includes(query)),
				);
				return { ...direction, services };
			})
			.filter((direction) => direction.services.length > 0 || normalize(direction.name).includes(query));
	});

	protected readonly visibleAgents = computed(() => {
		const agents = this.selected()?.service.agents ?? [];
		const query = normalize(this.agentQuery().trim());
		if (!query) return agents;
		return agents.filter((agent) => normalize(`${agentFullName(agent)} ${agent.position ?? ''}`).includes(query));
	});

	constructor() {
		this.load();
	}

	// ---------- Sélection et recherche ----------

	protected select(serviceId: number) {
		this.selectedId.set(serviceId);
		this.agentQuery.set('');
	}

	protected onQuery(event: Event) {
		this.query.set((event.target as HTMLInputElement).value);
	}

	protected onAgentQuery(event: Event) {
		this.agentQuery.set((event.target as HTMLInputElement).value);
	}

	// ---------- Ajout d'une direction ou d'un service ----------

	protected startAddDirection() {
		this.directionName.reset();
		this.addingServiceIn.set(null);
		this.addingDirection.set(true);
	}

	protected addDirection() {
		if (this.directionName.invalid) return this.directionName.markAsTouched();
		this.run(this.organization.createDirection(this.directionName.value.trim()), 'Direction ajoutée.');
	}

	protected startAddService(direction: Direction) {
		this.serviceName.reset();
		this.addingDirection.set(false);
		this.addingServiceIn.set(direction.id);
	}

	protected addService(direction: Direction) {
		if (this.serviceName.invalid) return this.serviceName.markAsTouched();
		this.run(
			this.organization.createService(this.serviceName.value.trim(), direction.id),
			'Service ajouté.',
			(created) => this.selectedId.set((created as OrgService).id), // le nouveau service s'affiche à droite
		);
	}

	protected cancelAdding() {
		this.addingDirection.set(false);
		this.addingServiceIn.set(null);
	}

	// ---------- Renommer ----------

	protected startRename(kind: RenameTarget['kind'], id: number, currentName: string) {
		this.renameName.setValue(currentName);
		this.renameName.markAsUntouched();
		this.renaming.set({ kind, id });
	}

	protected confirmRename() {
		const target = this.renaming();
		if (!target) return;
		if (this.renameName.invalid) return this.renameName.markAsTouched();
		const name = this.renameName.value.trim();
		const request =
			target.kind === 'direction'
				? this.organization.renameDirection(target.id, name)
				: this.organization.renameService(target.id, name);
		this.run(request, 'Nom modifié.');
	}

	// ---------- Agent : ajout et modification (panneau latéral) ----------

	protected openAgentDrawer(agent: Agent | null) {
		this.agentForm.reset({
			lastName: agent?.lastName ?? '',
			firstName: agent?.firstName ?? '',
			position: agent?.position ?? '',
			serviceId: agent?.serviceId ?? this.selectedId(),
		});
		this.drawer.set({ agent });
	}

	protected saveAgent() {
		if (this.agentForm.invalid) return this.agentForm.markAllAsTouched();
		const value = this.agentForm.getRawValue();
		const payload: AgentPayload = {
			lastName: value.lastName.trim(),
			firstName: value.firstName.trim(),
			position: value.position.trim(),
			serviceId: Number(value.serviceId),
		};
		const agent = this.drawer()?.agent;
		this.run(
			agent ? this.organization.updateAgent(agent.id, payload) : this.organization.createAgent(payload),
			agent ? 'Agent modifié.' : 'Agent ajouté.',
		);
	}

	// ---------- Suppression (avec confirmation) ----------

	protected askDelete(kind: PendingDelete['kind'], id: number, label: string) {
		this.pendingDelete.set({ kind, id, label });
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
		this.run(request, 'Supprimé.');
	}

	// ---------- Affichage ----------

	protected agentName(agent: Agent) {
		return agentFullName(agent);
	}

	protected initials(agent: Agent) {
		return `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`.toUpperCase();
	}

	// Échap ferme le panneau et les fenêtres ouvertes
	closeOverlays() {
		this.drawer.set(null);
		this.renaming.set(null);
		this.pendingDelete.set(null);
	}

	// ---------- Utilitaires ----------

	// Exécute une requête puis recharge l'organisation ; les erreurs de l'API (doublon, élément utilisé…) sont affichées telles quelles
	private run(request: Observable<unknown>, successMessage: string, onSuccess?: (result: unknown) => void) {
		this.busy.set(true);
		request.subscribe({
			next: (result) => {
				this.busy.set(false);
				this.cancelAdding();
				this.closeOverlays();
				onSuccess?.(result);
				this.toast.success(successMessage);
				this.load();
			},
			error: (error) => {
				this.busy.set(false);
				this.toast.error(errorMessage(error));
			},
		});
	}

	private load() {
		this.loading.set(true);
		this.organization.tree().subscribe({
			next: (directions) => {
				this.directions.set(directions);
				this.keepValidSelection(directions);
				this.error.set(null);
				this.loading.set(false);
			},
			error: (error) => {
				this.error.set(errorMessage(error));
				this.loading.set(false);
			},
		});
	}

	// Si le service affiché n'existe plus (supprimé), on affiche le premier service de la liste
	private keepValidSelection(directions: Direction[]) {
		const services = directions.flatMap((direction) => direction.services);
		if (!services.some((service) => service.id === this.selectedId())) {
			this.selectedId.set(services[0]?.id ?? null);
		}
	}
}

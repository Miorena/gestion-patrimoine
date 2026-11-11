import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/http-error';
import { ToastService } from '../../../core/toast/toast.service';
import { RoleOption, UserRow } from '../settings.models';
import { UsersService } from '../users.service';

@Component({
	selector: 'app-users-tab',
	imports: [ReactiveFormsModule],
	templateUrl: './users-tab.html',
})
export class UsersTab {
	private readonly usersService = inject(UsersService);
	private readonly auth = inject(AuthService);
	private readonly toast = inject(ToastService);

	protected readonly users = signal<UserRow[]>([]);
	protected readonly roles = signal<RoleOption[]>([]);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly creating = signal(false); // le formulaire d'ajout est ouvert
	protected readonly saving = signal(false);

	// Un administrateur ne peut pas changer son propre rôle (l'API le refuse aussi)
	protected readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

	protected readonly form = new FormGroup({
		name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
		email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
		password: new FormControl('', {
			nonNullable: true,
			validators: [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
		}),
		roleId: new FormControl<number | null>(null, { validators: [Validators.required] }),
	});

	constructor() {
		this.load();
	}

	protected openForm() {
		this.form.reset();
		this.creating.set(true);
	}

	protected closeForm() {
		this.creating.set(false);
	}

	protected submit() {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		const { name, email, password, roleId } = this.form.getRawValue();
		this.saving.set(true);
		this.usersService.create({ name, email, password, roleId: roleId as number }).subscribe({
			next: (user) => {
				this.saving.set(false);
				this.creating.set(false);
				this.toast.success(`Utilisateur « ${user.name} » ajouté.`);
				this.load();
			},
			error: (error) => {
				this.saving.set(false);
				this.toast.error(errorMessage(error));
			},
		});
	}

	protected changeRole(user: UserRow, value: string) {
		const roleId = Number(value);
		if (roleId === user.roleId) return;
		this.usersService.update(user.id, { roleId }).subscribe({
			next: (updated) => {
				this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
				this.toast.success('Rôle mis à jour. Il s’appliquera à la prochaine connexion de l’utilisateur.');
			},
			error: (error) => {
				this.toast.error(errorMessage(error));
				this.load(); // remet la liste déroulante sur le rôle réellement enregistré
			},
		});
	}

	private load() {
		this.loading.set(true);
		forkJoin({ users: this.usersService.list(), roles: this.usersService.roles() }).subscribe({
			next: ({ users, roles }) => {
				this.users.set(users);
				this.roles.set(roles);
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

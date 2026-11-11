import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/http-error';
import { ToastService } from '../../core/toast/toast.service';

@Component({
	selector: 'app-login',
	imports: [ReactiveFormsModule],
	templateUrl: './login.html',
})
export class Login {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly toast = inject(ToastService);

	protected readonly form = inject(NonNullableFormBuilder).group({
		email: ['', [Validators.required, Validators.email]],
		password: ['', Validators.required],
	});
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly showPassword = signal(false);

	constructor() {
		// Already logged in: go straight to the app
		if (this.auth.isLoggedIn()) this.router.navigate(['/assets']);
	}

	protected togglePassword() {
		this.showPassword.update((visible) => !visible);
	}

	protected submit() {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		this.loading.set(true);
		this.error.set(null);

		const { email, password } = this.form.getRawValue();
		this.auth.login(email, password).subscribe({
			next: () => {
				const name = this.auth.user()?.name;
				this.toast.success(name ? `Bienvenue, ${name} !` : 'Connexion réussie.');
				const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/assets';
				this.router.navigateByUrl(returnUrl);
			},
			error: (error) => {
				this.error.set(errorMessage(error));
				this.loading.set(false);
			},
		});
	}
}

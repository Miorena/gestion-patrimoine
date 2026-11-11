import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ToastService } from './core/toast/toast.service';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, RouterLink, RouterLinkActive],
	host: { '(document:keydown.escape)': 'closeMenu()' },
	templateUrl: './app.html',
})
export class App {
	protected readonly auth = inject(AuthService);
	protected readonly toast = inject(ToastService);
	protected readonly logoutDialog = viewChild<ElementRef<HTMLDialogElement>>('logoutDialog');

	protected readonly menuOpen = signal(false);

	constructor() {
		// Une déconnexion (ou une session expirée) referme toujours le menu
		effect(() => {
			if (!this.auth.user()) this.menuOpen.set(false);
		});
	}

	protected toggleMenu() {
		this.menuOpen.update((open) => !open);
	}

	closeMenu() {
		this.menuOpen.set(false);
	}

	protected openSettings() {
		this.closeMenu();
		this.toast.info('En cours de développement...');
	}

	protected askLogout() {
		this.closeMenu();
		this.logoutDialog()?.nativeElement.showModal();
	}

	protected cancelLogout() {
		this.logoutDialog()?.nativeElement.close();
	}

	protected confirmLogout() {
		this.cancelLogout();
		this.auth.logout();
		this.toast.info('Vous avez été déconnecté.')
	}

	protected onDialogClick(event: MouseEvent) {
		if (event.target === event.currentTarget) this.cancelLogout();
	}
}

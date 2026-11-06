import { Component, inject, ElementRef, viewChild } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, RouterLink],
	templateUrl: './app.html',
})
export class App {
	protected readonly auth = inject(AuthService);
	protected readonly toast = inject(ToastService);
	protected readonly logoutDialog = viewChild<ElementRef<HTMLDialogElement>>('logoutDialog');

	protected askLogout() {
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

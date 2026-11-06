import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
	readonly toasts = signal<Toast[]>([]);
	private nextId = 1;

	success(message: string) {
		this.show('success', message);
	}

	info(message: string) {
		this.show('info', message);
	}

	error(message: string) {
		this.show('error', message, 7000); // les erreurs restent un peu plus longtemps
	}

	dismiss(id: number) {
		this.toasts.update((list) => list.filter((toast) => toast.id !== id));
	}

	private show(kind: ToastKind, message: string, durationMs = 4000) {
		const id = this.nextId++;
		this.toasts.update((list) => [...list, { id, kind, message }]);
		setTimeout(() => this.dismiss(id), durationMs);
	}
}
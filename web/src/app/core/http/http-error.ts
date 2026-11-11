import { HttpErrorResponse } from '@angular/common/http';

// Turns an API error into a message readable by the user
export function errorMessage(error: unknown): string {
	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) return 'Serveur injoignable. Vérifiez que l’API est démarrée.';
		const message = error.error?.message;
		if (Array.isArray(message)) return message.join(' · ');
		if (typeof message === 'string') return message;
	}
	return 'Une erreur est survenue.';
}

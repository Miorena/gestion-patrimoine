import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
export const authGuard: CanActivateFn = (_route, state) => {
	const auth = inject(AuthService);
	return auth.isLoggedIn()
		? true
		: inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Restreint une route à certains rôles (l'API applique la même règle)
export const roleGuard =
	(...roles: string[]): CanActivateFn =>
		() => {
			return inject(AuthService).hasRole(...roles) ? true : inject(Router).createUrlTree(['/assets']);
		};

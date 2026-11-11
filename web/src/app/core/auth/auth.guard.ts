import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Redirects to the login page when not authenticated
export const authGuard: CanActivateFn = (_route, state) => {
	const auth = inject(AuthService);
	return auth.isLoggedIn()
		? true
		: inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Restricts a route to some roles (the API enforces the same rule)
export const roleGuard =
	(...roles: string[]): CanActivateFn =>
		() => {
			return inject(AuthService).hasRole(...roles) ? true : inject(Router).createUrlTree(['/assets']);
		};

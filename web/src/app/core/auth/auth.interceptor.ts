import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../http/api-url';
import { AuthService } from './auth.service';

// Adds the token to API calls and logs out when it is rejected (expired token)
export const authInterceptor: HttpInterceptorFn = (request, next) => {
	const auth = inject(AuthService);
	const token = auth.token;

	const authorized =
		token && request.url.startsWith(API_URL)
			? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
			: request;

	return next(authorized).pipe(
		catchError((error) => {
			if (error.status === 401 && !request.url.endsWith('/auth/login')) auth.logout();
			return throwError(() => error);
		}),
	);
};

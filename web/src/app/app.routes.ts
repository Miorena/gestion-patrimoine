import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
	{
		// Une seule page : la liste à gauche, le détail / modification / création à droite
		path: 'assets',
		canActivate: [authGuard],
		loadComponent: () => import('./features/assets/asset-list/asset-list').then((m) => m.AssetList),
	},
	{ path: '', pathMatch: 'full', redirectTo: 'assets' },
	{ path: '**', redirectTo: 'assets' },
];
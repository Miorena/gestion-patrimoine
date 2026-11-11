import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';
import { ROLE } from './core/auth/auth.models';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
	{
		// Une seule page : la liste à gauche, le détail / modification / création à droite
		path: 'assets',
		canActivate: [authGuard],
		loadComponent: () => import('./features/assets/asset-list/asset-list').then((m) => m.AssetList),
	},
	{
		// Historique de tous les biens, avec recherche et tri
		path: 'history',
		canActivate: [authGuard],
		loadComponent: () => import('./features/history/history-page').then((m) => m.HistoryPage),
	},
	{
		// Paramètres : utilisateurs et organisation, réservés à l'administrateur
		path: 'settings',
		canActivate: [authGuard, roleGuard(ROLE.ADMINISTRATOR)],
		loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
	},
	{ path: '', pathMatch: 'full', redirectTo: 'assets' },
	{ path: '**', redirectTo: 'assets' },
];
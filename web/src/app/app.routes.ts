import { Routes } from '@angular/router';
import { ROLE } from './core/models';
import { authGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: 'assets',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/assets/asset-list').then((m) => m.AssetList) },
      {
        path: 'new',
        canActivate: [roleGuard(ROLE.ADMINISTRATOR, ROLE.MANAGER)],
        loadComponent: () => import('./features/assets/asset-form').then((m) => m.AssetForm),
      },
      { path: ':id', loadComponent: () => import('./features/assets/asset-detail').then((m) => m.AssetDetail) },
      {
        path: ':id/edit',
        canActivate: [roleGuard(ROLE.ADMINISTRATOR, ROLE.MANAGER)],
        loadComponent: () => import('./features/assets/asset-form').then((m) => m.AssetForm),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'assets' },
  { path: '**', redirectTo: 'assets' },
];

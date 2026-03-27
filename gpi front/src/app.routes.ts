import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { authGuard, roleGuard } from './app/services/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      { path: 'admin',              canActivate: [roleGuard('admin')],                      loadComponent: () => import('./app/pages/admin/administration/administration').then(m => m.Administration) },
      { path: 'admin/utilisateurs', canActivate: [roleGuard('admin')],                      loadComponent: () => import('./app/pages/admin/utilisateurs/utilisateurs').then(m => m.Utilisateurs) },
      { path: 'admin/annuaire',     canActivate: [roleGuard('admin')],                      loadComponent: () => import('./app/pages/admin/annuaire/annuaire').then(m => m.Annuaire) },
      { path: 'admin/parametrage',  canActivate: [roleGuard('admin')],                      loadComponent: () => import('./app/pages/admin/parametrage/parametrage').then(m => m.Parametrage) },
      { path: 'backoffice',         canActivate: [roleGuard('admin', 'backoffice')],         loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'client',             canActivate: [roleGuard('admin', 'backoffice', 'client')], loadComponent: () => import('./app/pages/client/client').then(m => m.Client) },
    ]
  },
  { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
  { path: '**',   redirectTo: 'auth/login' }
];
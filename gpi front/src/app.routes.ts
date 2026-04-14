import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { AuthGuard } from './app/services/auth.guard';

export const appRoutes: Routes = [

  // ✅ Route redirect HORS du AppLayout
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./app/pages/redirect/redirect.component').then(m => m.RedirectComponent)
  },

  // ✅ Routes protégées DANS AppLayout
  {
    path: '',
    component: AppLayout,
    children: [
      { path: 'admin',                       data: { roles: ['Admin'] },                        canActivate: [AuthGuard], loadComponent: () => import('./app/pages/admin/administration/administration').then(m => m.Administration) },
      { path: 'admin/utilisateurs',          data: { roles: ['Admin'] },                        canActivate: [AuthGuard], loadComponent: () => import('./app/pages/admin/utilisateurs/utilisateurs').then(m => m.Utilisateurs) },
      { path: 'admin/annuaire',              data: { roles: ['Admin'] },                        canActivate: [AuthGuard], loadComponent: () => import('./app/pages/admin/annuaire/annuaire').then(m => m.Annuaire) },
      { path: 'admin/parametrage',           data: { roles: ['Admin'] },                        canActivate: [AuthGuard], loadComponent: () => import('./app/pages/admin/parametrage/parametrage').then(m => m.Parametrage) },
      { path: 'backoffice',                  data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/dashboard',        data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/entrants',         data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/vue-transactionnelle', data: { roles: ['Admin', 'Backoffice'] },       canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/annulation',       data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/annulations',      data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/historique',       data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'backoffice/emis',             data: { roles: ['Admin', 'Backoffice'] },           canActivate: [AuthGuard], loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) },
      { path: 'client',                      data: { roles: ['Admin', 'Backoffice', 'Client'] }, canActivate: [AuthGuard], loadComponent: () => import('./app/pages/client/client').then(m => m.Client) },
    ]
  },
  {
  path: 'auth/change-password',
  loadComponent: () => import('./app/pages/auth/change-password/change-password')
    .then(m => m.ChangePasswordComponent)
},

  { path: '**', redirectTo: '' }
];
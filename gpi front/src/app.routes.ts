import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { inject } from '@angular/core';
import { AuthService } from './app/services/auth.service';
import { Router } from '@angular/router';

const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/auth/login']);
  return false;
};

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'admin',
        loadComponent: () => import('./app/pages/admin/administration/administration').then(m => m.Administration)
      },
      {
        path: 'admin/utilisateurs',
        loadComponent: () => import('./app/pages/admin/utilisateurs/utilisateurs').then(m => m.Utilisateurs)
      },
      {
        path: 'admin/annuaire',
        loadComponent: () => import('./app/pages/admin/annuaire/annuaire').then(m => m.Annuaire)
      },
      {
        path: 'admin/parametrage',
        loadComponent: () => import('./app/pages/admin/parametrage/parametrage').then(m => m.Parametrage)
      },
    ]
  },
  {
    path: 'backoffice',
    canActivate: [authGuard],
    loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./app/pages/auth/auth.routes')
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
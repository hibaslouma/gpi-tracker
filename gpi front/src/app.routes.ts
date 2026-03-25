import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AppLayout,
    children: [
      // ── Admin ──────────────────────────────
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

      // ── Backoffice ─────────────────────────
      { 
        path: 'backoffice', 
        loadComponent: () => import('./app/pages/backoffice/backoffice').then(m => m.BackofficeComponent) 
      },

      // ── Client ─────────────────────────────
      { 
        path: 'client', 
        loadComponent: () => import('./app/pages/client/client').then(m => m.Client) 
      },
    ]
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
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
      // ✅ CORRECTION : loadComponent + chemin admin/parametrage
      { 
        path: 'admin/parametrage', 
        loadComponent: () => import('./app/pages/admin/parametrage/parametrage').then(m => m.Parametrage) 
      },
    ]
  },

  { 
    path: 'backoffice', 
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
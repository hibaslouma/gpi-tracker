import { Routes } from '@angular/router';
import { Login } from './login';

export default [
  { path: 'login', component: Login },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'change-password',
    loadComponent: () => import('./change-password/change-password').then(m => m.ChangePasswordComponent)
  }
] as Routes;
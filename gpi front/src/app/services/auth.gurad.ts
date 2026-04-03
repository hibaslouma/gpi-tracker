import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigateByUrl('/auth/login');
  return false;
};

export const roleGuard = (...allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      router.navigateByUrl('/auth/login');
      return false;
    }
    const role = auth.getRole();
    if (allowedRoles.includes(role)) return true;
    router.navigateByUrl(`/${role}`);
    return false;
  };
};
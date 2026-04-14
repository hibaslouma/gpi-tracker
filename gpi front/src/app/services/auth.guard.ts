import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { KeycloakAuthGuard, KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class AuthGuard extends KeycloakAuthGuard {

  constructor(
    protected override readonly router: Router,
    protected readonly keycloak: KeycloakService
  ) {
    super(router, keycloak);
  }

  async isAccessAllowed(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {

    // Non authentifié → redirection vers Keycloak :8180
    if (!this.authenticated) {
      await this.keycloak.login();
      return false;
    }

    //Pas de rôle requis → accès autorisé
    const requiredRoles = route.data['roles'] as string[];
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Vérifier si l'utilisateur a le bon rôle
    const userRoles = this.keycloak.getUserRoles();
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      if (userRoles.includes('Admin'))           this.router.navigateByUrl('/admin');
      else if (userRoles.includes('Backoffice')) this.router.navigateByUrl('/backoffice');
      else                                       this.router.navigateByUrl('/client');
      return false;
    }

    return true;
  }
}
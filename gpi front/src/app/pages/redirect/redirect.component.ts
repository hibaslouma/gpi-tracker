import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-redirect',
  standalone: true,
  template: `<div style="display:flex;align-items:center;justify-content:center;height:100vh;">Chargement...</div>`
})
export class RedirectComponent implements OnInit {

  constructor(
    private keycloak: KeycloakService,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // ✅ Vérifier firstLogin via Spring Boot
    this.authService.getMe().subscribe({
      next: (me) => {
        if (me.firstLogin) {
          // ✅ Première connexion → changer le mot de passe
          this.router.navigateByUrl('/auth/change-password');
          return;
        }
        // ✅ Rediriger selon le rôle
        const roles = this.keycloak.getUserRoles();
        if (roles.includes('Admin')) {
          this.router.navigateByUrl('/admin');
        } else if (roles.includes('Backoffice')) {
          this.router.navigateByUrl('/backoffice');
        } else {
          this.router.navigateByUrl('/client');
        }
      },
      error: () => {
        // Si /me échoue, rediriger selon le rôle
        const roles = this.keycloak.getUserRoles();
        if (roles.includes('Admin')) {
          this.router.navigateByUrl('/admin');
        } else if (roles.includes('Backoffice')) {
          this.router.navigateByUrl('/backoffice');
        } else {
          this.router.navigateByUrl('/client');
        }
      }
    });
  }
}
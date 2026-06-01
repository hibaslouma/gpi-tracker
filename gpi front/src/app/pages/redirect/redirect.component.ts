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
    //  Vérifier firstLogin via Spring Boot
    this.authService.getMe().subscribe({
      next: (me) => {
        if (me.firstLogin) {
          this.router.navigateByUrl('/auth/change-password');
          return;
        }

        this.redirectByRole();
      },
      error: () => {
        this.redirectByRole();
      }
    });
  }

  private redirectByRole(): void {
    const roles = this.keycloak.getUserRoles();

    sessionStorage.setItem('role',
      roles.includes('Admin')
        ? 'Admin'
        : roles.includes('Backoffice')
          ? 'Backoffice'
          : 'Client'
    );

    if (roles.includes('Admin')) {
      this.router.navigateByUrl('/admin');
    } else if (roles.includes('Backoffice')) {
      this.router.navigateByUrl('/backoffice');
    } else {
      this.router.navigateByUrl('/client');
    }
  }
}
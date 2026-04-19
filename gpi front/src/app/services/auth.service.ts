import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(
    private http: HttpClient,
    private keycloak: KeycloakService
  ) {}

  // ✅ Logout via Keycloak
  logout(): void {
    this.keycloak.logout('http://localhost:4200');
  }

  // ✅ Rôle extrait depuis Keycloak
  getRole(): string {
    const roles = this.keycloak.getUserRoles();
    if (roles.includes('Admin'))      return 'Admin';
    if (roles.includes('Backoffice')) return 'Backoffice';
    if (roles.includes('Client'))     return 'Client';
    return 'Client';
  }

  // ✅ Authentification gérée par Keycloak
  isAuthenticated(): boolean {
    return this.keycloak.isLoggedIn();
  }

  // ✅ Profil utilisateur depuis Keycloak
  getUserProfile() {
    return this.keycloak.loadUserProfile();
  }

  // ✅ Appel Spring Boot
  getMe(): Observable<any> {
    return this.http.get<any>('http://localhost:8080/api/auth/me');
  }
  // ✅ Changer le mot de passe
changePassword(email: string, newPassword: string): Observable<any> {
    return this.http.post<any>(
        'http://localhost:8080/api/auth/change-password',
        { email, newPassword }
    );
}

// ✅ Finaliser inscription
finaliserInscription(): Observable<any> {
    return this.http.patch<any>(
        'http://localhost:8080/api/auth/finaliser-inscription',
        {}
    );
}
}
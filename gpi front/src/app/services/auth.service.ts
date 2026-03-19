import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

// Instance partagée — une seule dans toute l'app
const keycloakInstance = new Keycloak({
  url: 'http://localhost:8180',
  realm: 'gpi-realm',
  clientId: 'gpi-backend'
});

let initialized = false;

export async function initKeycloak(): Promise<boolean> {
  if (initialized) return keycloakInstance.authenticated ?? false;
  const authenticated = await keycloakInstance.init({
    onLoad: 'login-required',
    checkLoginIframe: false
  });
  initialized = true;
  return authenticated;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  getToken(): string | undefined {
    return keycloakInstance.token;
  }

  getRole(): string {
    const roles = keycloakInstance.realmAccess?.roles ?? [];
    if (roles.includes('Backoffice')) return 'backoffice';
    return 'admin';
  }

  getUsername(): string {
    return keycloakInstance.idTokenParsed?.['preferred_username'] ?? '';
  }

  isAuthenticated(): boolean {
    return !!keycloakInstance.authenticated;
  }

  async logout(): Promise<void> {
    await keycloakInstance.logout({
      redirectUri: window.location.origin
    });
  }
}
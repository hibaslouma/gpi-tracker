import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private keycloak: Keycloak;
  private _initialized = false;

  constructor() {
    this.keycloak = new Keycloak({
      url: 'http://localhost:8180',
      realm: 'gpi-realm',
      clientId: 'gpi-backend'
    });
  }

  async init(): Promise<boolean> {
    if (this._initialized) return this.keycloak.authenticated ?? false;
    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'login-required',   // ← redirige directement vers Keycloak
        checkLoginIframe: false
      });
      this._initialized = true;
      return authenticated;
    } catch (e) {
      console.error('Keycloak init error', e);
      this._initialized = true;
      return false;
    }
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  getRole(): string {
    const roles = this.keycloak.realmAccess?.roles ?? [];
    if (roles.includes('Backoffice')) return 'backoffice';
    return 'admin';
  }

  getUsername(): string {
    return this.keycloak.idTokenParsed?.['preferred_username'] ?? '';
  }

  isAuthenticated(): boolean {
    return !!this.keycloak.authenticated;
  }

  async logout(): Promise<void> {
    await this.keycloak.logout({
      redirectUri: window.location.origin + '/auth/login'
    });
  }
}
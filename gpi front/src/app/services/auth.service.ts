import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

const KEYCLOAK_URL = 'http://localhost:8180/realms/gpi/protocol/openid-connect/token';
const CLIENT_ID    = 'gpi-frontend';
const TOKEN_KEY    = 'token';
const ROLE_KEY     = 'role';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ token: string; role: string }> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', CLIENT_ID)
      .set('username', email)
      .set('password', password);

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http.post<any>(KEYCLOAK_URL, body.toString(), { headers }).pipe(
      map(res => {
        const token: string = res.access_token;
        const role: string  = this.extractRole(token);
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(ROLE_KEY, role);
        return { token, role };
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getRole(): string {
    return sessionStorage.getItem(ROLE_KEY) || '';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private extractRole(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles: string[] = payload?.realm_access?.roles || [];
      if (roles.includes('SuperAdmin')) return 'admin';
      if (roles.includes('Backoffice'))  return 'backoffice';
      if (roles.includes('Client'))      return 'client';
      return 'client';
    } catch {
      return 'client';
    }
  }
}
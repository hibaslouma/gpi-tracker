import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private keycloakUrl = 'http://localhost:8180/realms/gpi-realm/protocol/openid-connect/token';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', 'gpi-frontend')
      .set('username', email)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<any>(this.keycloakUrl, body.toString(), {
      headers,
      observe: 'response'
    }).pipe(
      map(response => {
        const res = response.body;
        const role = this.extractRole(res.access_token);

        
        sessionStorage.setItem('token', res.access_token);
        sessionStorage.setItem('role', role);

        return { token: res.access_token, role };
      })
    );
  }

  private extractRole(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles: string[] = payload?.realm_access?.roles || [];
      if (roles.includes('SuperAdmin')) return 'admin';
      if (roles.includes('Backoffice')) return 'backoffice';
      return 'client';
    } catch (e) {
      return 'client';
    }
  }

  logout() {
    // ✅ sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
  }

  getToken(): string | null {
    // ✅ sessionStorage
    return sessionStorage.getItem('token');
  }

  getRole(): string {
    // ✅ Méthode centralisée — plus de lecture directe partout
    return sessionStorage.getItem('role') || '';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
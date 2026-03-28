import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private keycloakUrl = 'http://localhost:8180/realms/gpi/protocol/openid-connect/token';

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
      }),
      catchError(error => {
        const errorData = error.error;
        const errorDescription = errorData?.error_description || '';

        console.log('Keycloak error status:', error.status);
        console.log('Keycloak error description:', errorDescription);

        // ✅ 400 OU 401 — les deux cas possibles
        if (error.status === 400 || error.status === 401) {
          if (errorDescription.includes('Account is not fully set up')) {
            sessionStorage.setItem('temp_email', email);
            sessionStorage.setItem('temp_password', password);
            console.log('✅ temp_email et temp_password sauvegardés');
            return throwError(() => ({ type: 'PASSWORD_CHANGE_REQUIRED' }));
          }
        }
        return throwError(() => error);
      })
    );
  }

  private extractRole(token: string): string {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const roles: string[] = payload?.realm_access?.roles || [];
    if (roles.includes('Admin')) return 'Admin';
    if (roles.includes('Backoffice')) return 'Backoffice';
    if (roles.includes('Client')) return 'Client';
    return 'Client';
  }

  logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('temp_email');
  sessionStorage.removeItem('temp_password');
}





  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getRole(): string {
    return sessionStorage.getItem('role') || '';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
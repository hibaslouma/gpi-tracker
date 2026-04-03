import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private keycloakUrl = 'http://localhost:8180/realms/gpi/protocol/openid-connect/token';
  private backendUrl  = 'http://localhost:8080/api/auth/me'; // ✅ nouveau endpoint

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
      switchMap(response => {
        const res = response.body;
        const role = this.extractRole(res.access_token);

        // ✅ sauvegarde dans localStorage uniquement
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('role', role);

        // ✅ appel Spring Boot pour récupérer firstLogin
        return this.http.get<any>(this.backendUrl, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${res.access_token}`
          })
        }).pipe(
          map(user => ({
            token     : res.access_token,
            role      : role,
            firstLogin: user.firstLogin // ✅ récupéré depuis Oracle DB
          }))
        );
      }),
      catchError(error => {
        const errorData = error.error;
        const errorDescription = errorData?.error_description || '';

        if (error.status === 400 || error.status === 401) {
          if (errorDescription.includes('Account is not fully set up')) {
            localStorage.setItem('temp_email', email);
            localStorage.setItem('temp_password', password);
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
    if (roles.includes('Admin'))      return 'Admin';
    if (roles.includes('Backoffice')) return 'Backoffice';
    if (roles.includes('Client'))     return 'Client';
    return 'Client';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('temp_email');
    localStorage.removeItem('temp_password');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string {
    return localStorage.getItem('role') || '';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
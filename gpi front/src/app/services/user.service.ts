import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?: string;
  initials?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  password?: string;
  createdAt?: string;
  lastLogin?: string;
  firstLogin?: boolean;
}

export interface LogDTO {
  action: string;
  admin: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:8080/api/admin/users';

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]>                  { return this.http.get<User[]>(this.api); }
  create(user: User): Observable<User>          { return this.http.post<User>(this.api, user); }
  update(id: string, u: User): Observable<User> { return this.http.put<User>(`${this.api}/${id}`, u); }
  delete(id: string): Observable<void>          { return this.http.delete<void>(`${this.api}/${id}`); }
  getLogs(id: string): Observable<LogDTO[]>     { return this.http.get<LogDTO[]>(`${this.api}/${id}/logs`); }
}
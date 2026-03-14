import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?: number;
  initials?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  password?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface LogDTO {
  date: string;
  action: string;
  admin: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:8080/api/admin/users';

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.api);
  }

  create(user: User): Observable<User> {
    return this.http.post<User>(this.api, user);
  }

  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.api}/${id}`, user);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  getLogs(id: number): Observable<LogDTO[]> {
    return this.http.get<LogDTO[]>(`${this.api}/${id}/logs`);
  }
}
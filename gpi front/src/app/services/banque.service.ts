import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Bank {
  id?: number;
  bic: string;
  nomBanque: string;
  paysCode: string;
  paysNom: string;
  flagUrl: string;
  typeBanque: string;
  devise: string;
  cutOff: string;
  fuseauHoraire: string;
}

@Injectable({ providedIn: 'root' })
export class BanqueService {
  private api = 'http://localhost:8080/api/banques';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Bank[]> {
    return this.http.get<Bank[]>(this.api);
  }

  create(bank: Bank): Observable<Bank> {
    return this.http.post<Bank>(this.api, bank);
  }

  update(id: number, bank: Bank): Observable<Bank> {
    return this.http.put<Bank>(`${this.api}/${id}`, bank);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
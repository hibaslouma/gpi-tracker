import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecapMg {
  id: number;
  messageId: string;
  senderName: string;
  senderAddress: string;
  senderBic: string;
  receiverName: string;
  receiverAddress: string;
  receiverBic: string;
  montant: number;
  devise: string;
  dateValeur: string;
  fileName: string;
  receivedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RecapMgService {
  private api = 'http://localhost:8080/api/backoffice/paiements-recus';

  constructor(private http: HttpClient) {}

  getPaiementsRecus(): Observable<RecapMg[]> {
    return this.http.get<RecapMg[]>(this.api);
  }
}
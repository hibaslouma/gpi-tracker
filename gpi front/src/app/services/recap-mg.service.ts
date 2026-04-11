import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecapMg {
  id: number;
  messageId: string;
  uetr: string;
  typeMsg: string;
  senderName: string;
  senderAddress: string;
  senderBic: string;
  senderIban: string;
  receiverName: string;
  receiverAddress: string;
  receiverBic: string;
  receiverIban: string;
  montant: number;
  devise: string;
  dateValeur: string;
  fileName: string;
  receivedAt: string;
  statut: string;
  motifRejet: string;
}

export interface BackofficeStats {
  totalRecus: number;
  enAttente: number;
  acceptes: number;
  rejetes: number;
  totalEmis: number;
  emisEnAttente: number;
  emisAcceptes: number;
  emisRejetes: number;
}

export interface HistoriqueItem {
  type: string;
  messageId: string;
  senderBic: string;
  receiverBic: string;
  montant: number;
  devise: string;
  statut: string;
  date: string;
  fileName?: string;
  motifRejet?: string;
}

export interface Pacs002Recu {
  messageId: string;
  orgnlMessageId: string;
  uetr: string;
  senderBic: string;
  receiverBic: string;
  montant: number;
  devise: string;
  statut: string;
  motifRejet: string;
  date: string;
}

export interface XmlResponse {
  fileName: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class RecapMgService {
  private api = 'http://localhost:8080/api/backoffice';

  constructor(private http: HttpClient) {}

  getPaiementsRecus(): Observable<RecapMg[]> {
    return this.http.get<RecapMg[]>(`${this.api}/paiements-recus`);
  }

  getPaiementsEmis(): Observable<RecapMg[]> {
    return this.http.get<RecapMg[]>(`${this.api}/paiements-emis`);
  }

  getStats(): Observable<BackofficeStats> {
    return this.http.get<BackofficeStats>(`${this.api}/stats`);
  }

  updateStatut(id: number, statut: string, motifRejet?: string): Observable<RecapMg> {
    return this.http.patch<RecapMg>(`${this.api}/paiements-recus/${id}/statut`, { statut, motifRejet });
  }

  getHistorique(): Observable<HistoriqueItem[]> {
    return this.http.get<HistoriqueItem[]>(`${this.api}/historique`);
  }

  getPacs002Recus(): Observable<Pacs002Recu[]> {
    return this.http.get<Pacs002Recu[]>(`${this.api}/pacs002-recus`);
  }

  // ✅ XML du pacs.008 émis
  getXmlEmis(id: number): Observable<XmlResponse> {
    return this.http.get<XmlResponse>(`${this.api}/paiements-emis/${id}/xml`);
  }

  // ✅ XML du pacs.008 reçu
  getXmlRecu(id: number): Observable<XmlResponse> {
    return this.http.get<XmlResponse>(`${this.api}/paiements-recus/${id}/xml`);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecapMg {
  id: number;
  messageId: string;
  uetr: string;
  typeMsg: string;
  msgType: string;
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

export interface Camt056 {
  id: number;
  messageId: string;
  originalMsgId: string;
  uetr: string;
  bicEmetteur: string;
  bicRecepteur: string;
  motif: string;
  motifDetail: string;
  statut: string;
  motifRefus: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
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

  updateStatut(id: number, statut: string, motifRejet?: string): Observable<Blob> {
    return this.http.patch(
      `${this.api}/paiements-recus/${id}/statut`,
      { statut, motifRejet },
      { responseType: 'blob' }
    );
  }

  getHistorique(): Observable<HistoriqueItem[]> {
    return this.http.get<HistoriqueItem[]>(`${this.api}/historique`);
  }

  getHistoriquePacs(): Observable<RecapMg[]> {
    return this.http.get<RecapMg[]>(`${this.api}/historique-pacs`);
  }

  getPacs002Recus(): Observable<Pacs002Recu[]> {
    return this.http.get<Pacs002Recu[]>(`${this.api}/pacs002-recus`);
  }

  getXmlEmis(id: number): Observable<XmlResponse> {
    return this.http.get<XmlResponse>(`${this.api}/paiements-emis/${id}/xml`);
  }

  getXmlRecu(id: number): Observable<XmlResponse> {
    return this.http.get<XmlResponse>(`${this.api}/paiements-recus/${id}/xml`);
  }

  // ── camt.056 ───────────────────────────────────────────────
  getCamt056(): Observable<Camt056[]> {
    return this.http.get<Camt056[]>(`${this.api}/camt056`);
  }

  // Send camt.056 — demande annulation for our EMIS pacs
  envoyerCamt056(originalMsgId: string, motif: string, motifDetail?: string): Observable<Camt056> {
    return this.http.post<Camt056>(`${this.api}/camt056`, {
      originalMsgId, motif, motifDetail
    });
  }

  // ✅ Respond to incoming camt.056 — réponse annulation (ACCP or RJCT)
  // Generates camt.029 and updates camt.056 statut
  repondreCamt056(
    id: number,
    decision: 'ACCP' | 'RJCT',
    motifRefus?: string
  ): Observable<any> {
    return this.http.post<any>(`${this.api}/camt056/${id}/repondre`, {
      decision,
      motifRefus
    });
  }

  // Generate camt.029 directly by UETR (used by Camt029Controller)
  genererCamt029(uetr: string): Observable<any> {
    return this.http.post<any>(`${this.api}/camt029`, { uetr });
  }
}
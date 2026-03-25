import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

export type StatutISO = 'PDNG' | 'ACCP' | 'ACSP' | 'ACSC' | 'RJCT' | 'CANC';

export interface Transaction {
  statutISO: StatutISO;
  uetr: string;
  bicEmetteur: string;
  bicRecepteur: string;
  montant: number;
  devise: string;
  date: string;
  motifRejet?: string;
  delaiGPI?: number;
  messages: MessageTrace[];
  agents: Agent[];
}

export interface MessageTrace {
  type: 'pacs.008' | 'pacs.002' | 'camt.056' | 'camt.029';
  dateHeure: string;
  statut: StatutISO;
  ref: string;
  detail?: string;
}

export interface Agent {
  bic: string;
  pays: string;
  role: 'emetteur' | 'intermediaire' | 'recepteur';
  statut: 'confirme' | 'en-transit' | 'en-attente';
  dateHeure?: string;
  ref?: string;
}

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.html',
  styleUrl: './client.scss'
})
export class Client implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  activeTab = 'dashboard';
  userName = '';
  userEmail = '';
  userInitials = '';
  userRole = 'Client';

  searchUetr = '';
  selectedTransaction: Transaction | null = null;

  transactions: Transaction[] = [
    {
      statutISO: 'ACSC',
      uetr: 'biat-1a2b3c4d-5e6f-7890',
      bicEmetteur: 'BIATTNTTXXX',
      bicRecepteur: 'BNPAFRPPXXX',
      montant: 15000,
      devise: 'TND',
      date: '22/03/2026',
      delaiGPI: 2,
      messages: [
        { type: 'pacs.008', dateHeure: '22/03/2026 09:00', statut: 'PDNG', ref: 'BIAT-2026-00123', detail: 'Initiation paiement international' },
        { type: 'pacs.002', dateHeure: '22/03/2026 09:45', statut: 'ACCP', ref: 'BNPA-2026-00456', detail: 'Paiement accepté par la banque réceptrice' },
        { type: 'pacs.002', dateHeure: '22/03/2026 10:30', statut: 'ACSC', ref: 'BNPA-2026-00789', detail: 'Crédit confirmé au bénéficiaire' }
      ],
      agents: [
        { bic: 'BIATTNTTXXX', pays: 'Tunisie', role: 'emetteur', statut: 'confirme' },
        { bic: 'BNPAFRPPXXX', pays: 'France', role: 'recepteur', statut: 'confirme' }
      ]
    }
  ];

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.loadUserFromToken();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['tab']) {
          this.activeTab = params['tab'];
          this.selectedTransaction = null;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserFromToken() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userName = payload.name || payload.preferred_username || 'Client';
        this.userEmail = payload.email || '';
        const parts = this.userName.trim().split(' ');
        this.userInitials = parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : this.userName.substring(0, 2).toUpperCase();
      } catch (e) {
        this.userName = 'Client';
      }
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.selectedTransaction = null;
    this.router.navigate(['/client'], { queryParams: { tab } });
  }

  ouvrirDetail(t: Transaction) {
    this.selectedTransaction = t;
    this.activeTab = 'detail';
  }

  retourListe() {
    this.selectedTransaction = null;
    this.setActiveTab('paiements');
  }

  get filteredTransactions(): Transaction[] {
    if (!this.searchUetr.trim()) return this.transactions;
    return this.transactions.filter(t =>
      t.uetr.toLowerCase().includes(this.searchUetr.toLowerCase())
    );
  }

  get nbEnAttente(): number {
    return this.transactions.filter(t => t.statutISO === 'PDNG' || t.statutISO === 'ACCP').length;
  }

  get nbConfirmes(): number {
    return this.transactions.filter(t => t.statutISO === 'ACSC').length;
  }

  get nbRejetes(): number {
    return this.transactions.filter(t => t.statutISO === 'RJCT').length;
  }

  getStatutClass(s: string): string {
    return ({ PDNG: 'badge-pdng', ACCP: 'badge-accp', ACSP: 'badge-acsp', ACSC: 'badge-acsc', RJCT: 'badge-rjct', CANC: 'badge-canc' } as any)[s] || '';
  }

  getStatutLabel(s: string): string {
    return ({ PDNG: 'En cours de traitement', ACCP: 'Accepté par la banque', ACSP: 'En cours de règlement', ACSC: 'Paiement effectué', RJCT: 'Paiement refusé', CANC: 'Paiement annulé' } as any)[s] || s;
  }

  getDelaiClass(h: number | undefined): string {
    if (!h) return '';
    return h <= 24 ? 'delai-ok' : 'delai-retard';
  }

  getDelaiLabel(h: number | undefined): string {
    if (!h) return '—';
    return h < 1 ? '< 1h' : `${h}h`;
  }

  formatMontant(n: number): string {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigateByUrl('/auth/login');
  }
}
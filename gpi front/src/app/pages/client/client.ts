import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RecapMgService, RecapMg } from '../../services/recap-mg.service';

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
  isLoading = false;

  // ── Real data from backend ─────────────────────────────────
  paiementsEmis: RecapMg[] = [];
  paiementsRecus: RecapMg[] = [];

  // ── Mapped transactions for display ───────────────────────
  transactions: Transaction[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private recapMgService: RecapMgService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUserFromToken();
    this.loadData();

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

  // ── Load real data from backend ────────────────────────────
  loadData(): void {
    this.isLoading = true;

    // Load emis (outgoing payments initiated by client's bank)
    this.recapMgService.getPaiementsEmis().subscribe({
      next: (data) => {
        this.paiementsEmis = data;
        this.mapTransactions();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement paiements émis:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    // Also load recus to show incoming in historique
    this.recapMgService.getPaiementsRecus().subscribe({
      next: (data) => {
        this.paiementsRecus = data;
        this.mapTransactions();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement paiements reçus:', err)
    });
  }

  // ── Map RecapMg → Transaction ──────────────────────────────
  private mapTransactions(): void {
    const all = [...this.paiementsEmis, ...this.paiementsRecus];

    this.transactions = all.map(p => {
      const statut = (p.statut || 'PDNG') as StatutISO;

      // Build message trace based on statut
      const messages: MessageTrace[] = [
        {
          type: 'pacs.008',
          dateHeure: p.receivedAt
            ? new Date(p.receivedAt).toLocaleString('fr-FR')
            : p.dateValeur || '—',
          statut: 'PDNG',
          ref: p.messageId,
          detail: 'Initiation du paiement'
        }
      ];

      if (statut !== 'PDNG') {
        messages.push({
          type: 'pacs.002',
          dateHeure: p.receivedAt
            ? new Date(p.receivedAt).toLocaleString('fr-FR')
            : '—',
          statut: statut,
          ref: 'ACK-' + p.messageId,
          detail: this.getStatutDetail(statut, p.motifRejet)
        });
      }

      return {
        statutISO: statut,
        uetr: p.uetr || p.messageId,
        bicEmetteur: p.senderBic || '—',
        bicRecepteur: p.receiverBic || '—',
        montant: p.montant || 0,
        devise: p.devise || 'TND',
        date: p.dateValeur
          ? new Date(p.dateValeur).toLocaleDateString('fr-FR')
          : (p.receivedAt ? new Date(p.receivedAt).toLocaleDateString('fr-FR') : '—'),
        motifRejet: p.motifRejet,
        messages,
        agents: [
          {
            bic: p.senderBic || '—',
            pays: '—',
            role: 'emetteur',
            statut: 'confirme'
          },
          {
            bic: p.receiverBic || '—',
            pays: '—',
            role: 'recepteur',
            statut: statut === 'ACSC' ? 'confirme' : 'en-attente'
          }
        ]
      } as Transaction;
    });

    this.cdr.detectChanges();
  }

  private getStatutDetail(statut: StatutISO, motif?: string): string {
    switch (statut) {
      case 'ACSC': return 'Crédit confirmé au bénéficiaire';
      case 'ACCP': return 'Paiement accepté par la banque';
      case 'ACSP': return 'Règlement en cours';
      case 'RJCT': return motif ? `Paiement rejeté — motif: ${motif}` : 'Paiement rejeté';
      case 'CANC': return 'Paiement annulé';
      default:     return 'En attente de traitement';
    }
  }

  private loadUserFromToken() {
    const token = sessionStorage.getItem('token');
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
      t.uetr.toLowerCase().includes(this.searchUetr.toLowerCase()) ||
      t.bicEmetteur.toLowerCase().includes(this.searchUetr.toLowerCase()) ||
      t.bicRecepteur.toLowerCase().includes(this.searchUetr.toLowerCase())
    );
  }

  // ── Stats from real data ───────────────────────────────────
  get nbEnAttente(): number {
    return this.transactions.filter(t =>
      t.statutISO === 'PDNG' || t.statutISO === 'ACCP' || t.statutISO === 'ACSP'
    ).length;
  }

  get nbConfirmes(): number {
    return this.transactions.filter(t => t.statutISO === 'ACSC').length;
  }

  get nbRejetes(): number {
    return this.transactions.filter(t =>
      t.statutISO === 'RJCT' || t.statutISO === 'CANC'
    ).length;
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
    return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    this.router.navigateByUrl('/auth/login');
  }
}
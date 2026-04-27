import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { RecapMgService, RecapMg } from '../../services/recap-mg.service';

export type StatutISO = 'PDNG' | 'ACCP' | 'ACSP' | 'ACSC' | 'RJCT' | 'CANC';

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
}

export interface Transaction {
  statutISO: StatutISO;
  uetr: string;
  bicEmetteur: string;
  bicRecepteur: string;
  montant: number;
  devise: string;
  date: string;
  motifRejet?: string;
  messages: MessageTrace[];
  agents: Agent[];
}

export interface TimelineStep {
  label: string;
  statut: string;
  date: string;
  ref: string;
  detail: string;
  done: boolean;
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
  searchUetrRecus = '';
  searchUetrEmis = '';

  selectedTransaction: Transaction | null = null;
  isLoading = false;

  paiementsEmis: RecapMg[] = [];
  paiementsRecus: RecapMg[] = [];
  transactions: Transaction[] = [];

  showTimelineModal = false;
  timelinePaiement: RecapMg | null = null;
  timelineSteps: TimelineStep[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private recapMgService: RecapMgService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserFromToken();
    this.loadData();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.activeTab = params['tab'] || 'dashboard';
        if (this.activeTab !== 'detail') {
          this.selectedTransaction = null;
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalize(value: string | undefined | null): string {
    return (value || '')
      .toString()
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase();
  }

  private loadUserFromToken(): void {
    const token = sessionStorage.getItem('token');

    if (!token) {
      this.userName = 'Client';
      this.userEmail = '';
      this.userInitials = 'CL';
      this.userRole = sessionStorage.getItem('role') || 'Client';
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        throw new Error('Token invalide');
      }

      const payload = JSON.parse(atob(parts[1]));

      this.userName =
        payload?.name ||
        payload?.fullName ||
        payload?.preferred_username ||
        payload?.username ||
        payload?.sub ||
        'Client';

      this.userEmail = payload?.email || '';
      this.userRole = payload?.role || sessionStorage.getItem('role') || 'Client';

      this.userInitials =
        this.userName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part.charAt(0).toUpperCase())
          .join('') || 'CL';
    } catch (error) {
      console.error('Erreur lors du décodage du token', error);
      this.userName = 'Client';
      this.userEmail = '';
      this.userInitials = 'CL';
      this.userRole = sessionStorage.getItem('role') || 'Client';
    }
  }

  loadData(): void {
    this.isLoading = true;

    forkJoin({
      emis: this.recapMgService.getPaiementsEmis(),
      recus: this.recapMgService.getPaiementsRecus()
    }).subscribe({
      next: ({ emis, recus }) => {
        this.paiementsEmis = emis || [];
        this.paiementsRecus = recus || [];
        this.mapTransactions();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement données client:', err);
        this.paiementsEmis = [];
        this.paiementsRecus = [];
        this.transactions = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapTransactions(): void {
    const all = [...this.paiementsEmis, ...this.paiementsRecus];

    this.transactions = all.map((p) => {
      const statut = (p.statut || 'PDNG') as StatutISO;

      const baseDateTime = p.receivedAt
        ? new Date(p.receivedAt).toLocaleString('fr-FR')
        : p.dateValeur
        ? new Date(p.dateValeur).toLocaleString('fr-FR')
        : '—';

      const displayDate = p.dateValeur
        ? new Date(p.dateValeur).toLocaleDateString('fr-FR')
        : p.receivedAt
        ? new Date(p.receivedAt).toLocaleDateString('fr-FR')
        : '—';

      const messages: MessageTrace[] = [
        {
          type: 'pacs.008',
          dateHeure: baseDateTime,
          statut: 'PDNG',
          ref: p.messageId,
          detail: 'Initiation du paiement'
        }
      ];

      if (statut !== 'PDNG') {
        messages.push({
          type: 'pacs.002',
          dateHeure: baseDateTime,
          statut,
          ref: `ACK-${p.messageId}`,
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
        date: displayDate,
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
  }

  private getStatutDetail(statut: StatutISO, motif?: string): string {
    switch (statut) {
      case 'ACSC':
        return 'Crédit confirmé au bénéficiaire';
      case 'ACCP':
        return 'Paiement accepté par la banque';
      case 'ACSP':
        return 'Règlement interbancaire en cours';
      case 'RJCT':
        return motif ? `Paiement rejeté — motif : ${motif}` : 'Paiement rejeté';
      case 'CANC':
        return 'Paiement annulé';
      default:
        return 'En attente de traitement';
    }
  }

  ouvrirTimeline(p: RecapMg): void {
    this.timelinePaiement = p;
    this.timelineSteps = this.buildTimelineSteps(p);
    this.showTimelineModal = true;
    this.cdr.detectChanges();
  }

  fermerTimeline(): void {
    this.showTimelineModal = false;
    this.timelinePaiement = null;
    this.timelineSteps = [];
    this.cdr.detectChanges();
  }

  private buildTimelineSteps(p: RecapMg): TimelineStep[] {
    const statut = (p.statut || 'PDNG') as StatutISO;
    const dateBase = p.receivedAt
      ? new Date(p.receivedAt).toLocaleString('fr-FR')
      : p.dateValeur
      ? new Date(p.dateValeur).toLocaleString('fr-FR')
      : '—';

    const reached = (s: string) => {
      const order = ['PDNG', 'ACCP', 'ACSP', 'ACSC'];
      const terminal = ['RJCT', 'CANC'];

      if (terminal.includes(statut)) {
        if (s === 'PDNG') return true;
        if (s === 'ACCP') return true;
        if (s === 'ACSP') return false;
        return false;
      }

      return order.indexOf(statut) >= order.indexOf(s);
    };

    return [
      {
        label: 'Initiation',
        statut: 'PDNG',
        date: dateBase,
        ref: p.messageId,
        detail: `pacs.008 — ${p.senderBic || '—'} → ${p.receiverBic || '—'}`,
        done: true
      },
      {
        label: 'Acceptation',
        statut: 'ACCP',
        date: reached('ACCP') ? dateBase : '—',
        ref: `pacs.002 / ${p.messageId}`,
        detail: 'Vérification technique par la banque destinataire',
        done: reached('ACCP')
      },
      {
        label: 'Règlement',
        statut: 'ACSP',
        date: reached('ACSP') ? dateBase : '—',
        ref: `ACSP / ${p.messageId}`,
        detail: 'Règlement interbancaire en cours',
        done: reached('ACSP')
      },
      {
        label: statut === 'RJCT' ? 'Rejeté' : statut === 'CANC' ? 'Annulé' : 'Crédit confirmé',
        statut: statut === 'RJCT' ? 'RJCT' : statut === 'CANC' ? 'CANC' : 'ACSC',
        date: ['ACSC', 'RJCT', 'CANC'].includes(statut) ? dateBase : '—',
        ref: `FINAL / ${p.messageId}`,
        detail: this.getStatutDetail(statut, p.motifRejet),
        done: ['ACSC', 'RJCT', 'CANC'].includes(statut)
      }
    ];
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.selectedTransaction = null;
    this.router.navigate(['/client'], { queryParams: { tab } });
  }

  ouvrirDetail(t: Transaction): void {
    this.selectedTransaction = t;
    this.activeTab = 'detail';
  }

  retourListe(): void {
    this.selectedTransaction = null;
    this.setActiveTab('historique');
  }

  get filteredTransactions(): Transaction[] {
    const q = this.normalize(this.searchUetr);
    if (!q) return this.transactions;

    return this.transactions.filter(t =>
      this.normalize(t.uetr).includes(q) ||
      this.normalize(t.bicEmetteur).includes(q) ||
      this.normalize(t.bicRecepteur).includes(q)
    );
  }

  get filteredPaiementsRecus(): RecapMg[] {
    const q = this.normalize(this.searchUetrRecus);
    if (!q) return this.paiementsRecus;

    return this.paiementsRecus.filter(p =>
      this.normalize(p.uetr).includes(q) ||
      this.normalize(p.messageId).includes(q) ||
      this.normalize(p.senderBic).includes(q) ||
      this.normalize(p.receiverBic).includes(q)
    );
  }

  get filteredPaiementsEmis(): RecapMg[] {
    const q = this.normalize(this.searchUetrEmis);
    if (!q) return this.paiementsEmis;

    return this.paiementsEmis.filter(p =>
      this.normalize(p.uetr).includes(q) ||
      this.normalize(p.messageId).includes(q) ||
      this.normalize(p.senderBic).includes(q) ||
      this.normalize(p.receiverBic).includes(q)
    );
  }

  get nbEnAttente(): number {
    return this.transactions.filter(t =>
      ['PDNG', 'ACCP', 'ACSP'].includes(t.statutISO)
    ).length;
  }

  get nbConfirmes(): number {
    return this.transactions.filter(t => t.statutISO === 'ACSC').length;
  }

  get nbRejetes(): number {
    return this.transactions.filter(t =>
      ['RJCT', 'CANC'].includes(t.statutISO)
    ).length;
  }

  getStatutClass(s: string): string {
    return ({
      PDNG: 'badge-pdng',
      ACCP: 'badge-accp',
      ACSP: 'badge-acsp',
      ACSC: 'badge-acsc',
      RJCT: 'badge-rjct',
      CANC: 'badge-canc'
    } as Record<string, string>)[s] || '';
  }

  getStatutLabel(s: string): string {
    return ({
      PDNG: 'En cours de traitement',
      ACCP: 'Accepté par la banque',
      ACSP: 'En cours de règlement',
      ACSC: 'Paiement effectué',
      RJCT: 'Paiement refusé',
      CANC: 'Paiement annulé'
    } as Record<string, string>)[s] || s;
  }

  formatMontant(n: number): string {
    return (n || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(val: string | undefined): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('fr-FR');
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    this.router.navigateByUrl('/auth/login');
  }
}
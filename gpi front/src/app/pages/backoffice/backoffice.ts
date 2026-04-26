import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RecapMgService, RecapMg, BackofficeStats, HistoriqueItem, Pacs002Recu, Camt056 } from '../../services/recap-mg.service';

export type StatutISO = 'PDNG' | 'ACCP' | 'ACSP' | 'ACSC' | 'RJCT' | 'CANC';
export type MotifRejet = 'AC01' | 'AC04' | 'AG01' | 'FF01' | 'MS03' | 'NARR';
export type MotifRefusCamt = 'LEGL' | 'CUST' | 'AGET' | 'NARR';

export interface Charge {
  bic: string; pays: string; montant: number; devise: string; type: 'SHA' | 'OUR' | 'BEN';
}
export interface Agent {
  bic: string; pays: string;
  role: 'emetteur' | 'intermediaire' | 'recepteur';
  statut: 'confirme' | 'en-transit' | 'en-attente';
  dateHeure?: string; ref?: string; charges: Charge[];
}
export interface MessageTrace {
  type: 'pacs.008' | 'pacs.002' | 'camt.056' | 'camt.029';
  dateHeure: string; statut: StatutISO; ref: string; detail?: string;
}
export interface Transaction {
  statutISO: StatutISO; uetr: string; bicEmetteur: string; bicRecepteur: string;
  montant: number; devise: string; date: string;
  agents: Agent[]; messages: MessageTrace[];
  motifRejet?: MotifRejet; motifRejetDetail?: string; delaiGPI?: number;
}
export interface PaiementEntrant {
  statutISO: StatutISO; uetr: string; bicEmetteur: string;
  montant: number; devise: string; date: string; motif: string;
  typeCharges: 'SHA' | 'OUR' | 'BEN';
  motifRejet?: MotifRejet; motifRejetDetail?: string;
}
export interface Annulation {
  reference: string; uetr: string; bicEmetteur: string;
  motif: string; motifDetail?: string; date: string;
  statutReponse: 'PDNG' | 'ACCP' | 'RJCT';
  motifRefus?: MotifRefusCamt; reponse: string;
}
export interface NouveauPaiement {
  bicDestinataire: string; iban: string; montant: number;
  devise: 'TND' | 'EUR' | 'USD' | 'GBP'; typeCharges: 'SHA' | 'OUR' | 'BEN'; motif: string;
}

@Component({
  selector: 'app-backoffice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backoffice.html',
  styleUrls: ['./backoffice.scss']
})
export class BackofficeComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private recapMgService: RecapMgService,
    private cdr: ChangeDetectorRef
  ) {}

  activeTab = 'dashboard';
  selectedTransaction: Transaction | null = null;

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;

  filterStatut = '';
  filterDevise = '';

  confirmationUetr = '';
  confirmationNouveauStatut: StatutISO = 'ACCP';
  confirmationMotifRejet: MotifRejet = 'AC01';
  confirmationMotifRejetDetail = '';
  confirmationTransaction: Transaction | null = null;

  searchAnnulations = '';
  currentPage = 1;
  pageSize = 10;

  showFormInitiation = false;
  nouveauPaiement: NouveauPaiement = {
    bicDestinataire: '', iban: '', montant: 0,
    devise: 'TND', typeCharges: 'SHA', motif: ''
  };

  showXmlModal = false;
  xmlContent = '';
  xmlFileName = '';

  showTimelineModal = false;
  timelinePaiement: RecapMg | null = null;

  showTraitementModal = false;
  paiementATraiter: RecapMg | null = null;
  modalNouveauStatut: StatutISO = 'ACSC';
  modalMotifRejet: MotifRejet = 'AC01';
  modalEnvoi = false;

  transactions: Transaction[] = [];
  paiementsEntrants: PaiementEntrant[] = [];
  paiementsRecus: RecapMg[] = [];
  paiementsEmis: RecapMg[] = [];
  pacs002Recus: Pacs002Recu[] = [];

  camt056List: Camt056[] = [];
  annulations: Annulation[] = [];
  camt056EnvoisEnCours = false;
  annulationMessageId = '';
  annulationMotif = 'DUPL';
  annulationRaison = '';

  motifRefusCamt029 = 'AGNT';

  historiquePacs: RecapMg[] = [];
  filtreHistPacsSearch = '';
  filtreHistPacsDirection = '';
  filtreHistPacsType = '';
  filtreHistPacsStatut = '';

  filtreSearch = '';
  filtreStatut = '';
  filtreDevise = '';
  filtreBicExp = '';
  filtreDateDu = '';
  filtreDateAu = '';

  filtreEmisSearch = '';
  filtreEmisStatut = '';
  filtreEmisDevise = '';
  filtreEmisBicExp = '';
  filtreEmisDateDu = '';

  filtreHistoriqueSearch = '';
  filtreHistoriqueType = '';
  filtreHistoriqueStatut = '';

  stats: BackofficeStats = {
    totalRecus: 0, enAttente: 0, acceptes: 0, rejetes: 0,
    totalEmis: 0, emisEnAttente: 0, emisAcceptes: 0, emisRejetes: 0
  };

  historiqueReel: HistoriqueItem[] = [];
  selectedMessageId = '';
  selectedRecapId: number | null = null;
  userName = '';
  userInitials = '';

  loadPaiementsRecus(): void {
    this.recapMgService.getPaiementsRecus().subscribe({
      next: (data) => {
        this.paiementsRecus = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur paiements reçus:', err)
    });
  }

  loadPaiementsEmis(): void {
    this.recapMgService.getPaiementsEmis().subscribe({
      next: (data) => {
        this.paiementsEmis = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur paiements émis:', err)
    });
  }

  loadStats(): void {
    this.recapMgService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur stats:', err)
    });
  }

  loadHistorique(): void {
    this.recapMgService.getHistorique().subscribe({
      next: (data) => {
        this.historiqueReel = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur historique:', err)
    });
  }

  loadCamt056(): void {
    this.recapMgService.getCamt056().subscribe({
      next: (data) => {
        this.camt056List = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur camt.056:', err)
    });
  }

  loadHistoriquePacs(): void {
    this.recapMgService.getHistoriquePacs().subscribe({
      next: (data) => {
        this.historiquePacs = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur historique pacs:', err)
    });
  }

  ngOnInit(): void {
    this.loadUserFromToken();
    this.activeTab = this.route.snapshot.queryParams['tab'] || 'dashboard';

    this.loadPaiementsRecus();
    this.loadPaiementsEmis();
    this.loadStats();
    this.loadHistorique();
    this.loadCamt056();
    this.loadHistoriquePacs();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.activeTab = params['tab'] || 'dashboard';
        this.selectedTransaction = null;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.selectedTransaction = null;
    this.router.navigate(['/backoffice'], { queryParams: { tab } });
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    this.router.navigateByUrl('/auth/login');
  }

  ouvrirDetailLigne(t: Transaction): void {
    this.selectedTransaction = t;
  }

  ouvrirDetailDashboard(t: Transaction): void {
    this.activeTab = 'vue-transactionnelle';
    this.selectedTransaction = t;
  }

  private loadUserFromToken(): void {
    const token = sessionStorage.getItem('token');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userName = payload.name || payload.preferred_username || 'Utilisateur';

        const parts = this.userName.trim().split(' ');
        this.userInitials = parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : this.userName.substring(0, 2).toUpperCase();

      } catch {
        this.userName = 'Utilisateur';
        this.userInitials = 'U';
      }
    }
  }

  voirXmlEmis(p: RecapMg): void {
    this.recapMgService.getXmlEmis(p.id).subscribe({
      next: (res) => {
        this.xmlFileName = res.fileName;
        this.xmlContent = res.content;
        this.showXmlModal = true;
        this.cdr.detectChanges();
      },
      error: () => this.displayToast('Erreur chargement XML', 'error')
    });
  }

  voirXmlRecu(p: RecapMg): void {
    this.recapMgService.getXmlRecu(p.id).subscribe({
      next: (res) => {
        this.xmlFileName = res.fileName;
        this.xmlContent = res.content;
        this.showXmlModal = true;
        this.cdr.detectChanges();
      },
      error: () => this.displayToast('Erreur chargement XML', 'error')
    });
  }

  fermerXmlModal(): void {
    this.showXmlModal = false;
  }

  voirTimelineEmis(p: RecapMg): void {
    this.timelinePaiement = p;
    this.showTimelineModal = true;
    this.cdr.detectChanges();
  }

  fermerTimelineModal(): void {
    this.showTimelineModal = false;
    this.timelinePaiement = null;
  }

  ouvrirModalTraitement(p: RecapMg): void {
    this.paiementATraiter = p;
    this.modalNouveauStatut = 'ACSC';
    this.modalMotifRejet = 'AC01';
    this.modalEnvoi = false;
    this.showTraitementModal = true;
  }

  fermerTraitementModal(): void {
    this.showTraitementModal = false;
    this.paiementATraiter = null;
  }

  confirmerTraitement(): void {
    if (!this.paiementATraiter) return;

    this.modalEnvoi = true;
    const statutEnvoi = this.modalNouveauStatut;
    const messageId = this.paiementATraiter.messageId;

    this.recapMgService.updateStatut(
      this.paiementATraiter.id,
      this.modalNouveauStatut,
      this.modalNouveauStatut === 'RJCT' ? this.modalMotifRejet : undefined
    ).subscribe({
      next: (blob: Blob) => {
        this.modalEnvoi = false;
        this.fermerTraitementModal();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pacs002_${messageId}_${statutEnvoi}.xml`;
        link.click();// ← téléchargement automatique
        window.URL.revokeObjectURL(url);

        this.displayToast(` pacs.002 généré — ${statutEnvoi}`, 'success');

        this.loadPaiementsRecus();// ← rafraîchit la liste
        this.loadStats();// ← rafraîchit les statistiques du dashboard
        this.loadHistorique();
        this.loadHistoriquePacs();
        this.cdr.detectChanges();
      },
      error: () => {
        this.modalEnvoi = false;
        this.displayToast('Erreur lors du traitement', 'error');
      }
    });
  }

  envoyerAnnulation(): void {
    if (!this.annulationMessageId.trim()) {
      this.displayToast('Veuillez sélectionner un paiement', 'error');
      return;
    }

    this.camt056EnvoisEnCours = true;
    this.cdr.detectChanges();

    this.recapMgService.envoyerCamt056(
      this.annulationMessageId,
      this.annulationMotif,
      this.annulationRaison
    ).subscribe({
      next: (result) => {
        this.camt056EnvoisEnCours = false;
        this.annulationMessageId = '';
        this.annulationRaison = '';

        this.loadCamt056();
        this.loadPaiementsEmis();
        this.loadHistoriquePacs();

        this.displayToast(`✅ camt.056 envoyé — ${result.messageId}`, 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.camt056EnvoisEnCours = false;
        this.displayToast(err?.error?.error || 'Erreur envoi camt.056', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  repondreAnnulation(a: Camt056, decision: 'ACCP' | 'RJCT'): void {
    const motifRefus = decision === 'RJCT' ? this.motifRefusCamt029 : undefined;

    this.recapMgService.repondreCamt056(a.id, decision, motifRefus).subscribe({
      next: () => {
        this.loadCamt056();
        this.loadPaiementsEmis();
        this.loadHistoriquePacs();
        this.loadStats();

        this.displayToast(
          decision === 'ACCP'
            ? '✅ camt.029 généré — annulation acceptée'
            : '❌ camt.029 généré — annulation refusée',
          decision === 'ACCP' ? 'success' : 'error'
        );

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.displayToast(
          err?.error?.error || 'Erreur génération camt.029',
          'error'
        );
      }
    });
  }

  getCamt056ForPaiement(p: RecapMg | null): Camt056 | null {
    if (!p) return null;

    return this.camt056List.find(c =>
      c.originalMsgId === p.messageId ||
      (!!c.uetr && !!p.uetr && c.uetr === p.uetr)
    ) || null;
  }

  hasCancellationPending(p: RecapMg | null): boolean {
    const c = this.getCamt056ForPaiement(p);
    return c?.statut === 'PDNG';
  }

  hasCancellationAccepted(p: RecapMg | null): boolean {
    const c = this.getCamt056ForPaiement(p);
    return c?.statut === 'ACCP';
  }

  hasCancellationRejected(p: RecapMg | null): boolean {
    const c = this.getCamt056ForPaiement(p);
    return c?.statut === 'RJCT';
  }

  get paiementsEnAttente(): RecapMg[] {
    return this.paiementsRecus.filter(p => p.statut === 'PDNG' || !p.statut);
  }

  get repartitionStatuts(): { statut: string; count: number; pct: number }[] {
    const total = this.paiementsRecus.length;
    if (total === 0) return [];

    const statuts = ['PDNG', 'ACCP', 'ACSP', 'ACSC', 'RJCT', 'CANC'];

    return statuts
      .map(s => ({
        statut: s,
        count: this.paiementsRecus.filter(p => p.statut === s || (!p.statut && s === 'PDNG')).length,
        pct: 0
      }))
      .filter(item => item.count > 0)
      .map(item => ({ ...item, pct: Math.round((item.count / total) * 100) }));
  }

  get paiementsRecusFiltres(): RecapMg[] {
    return this.paiementsRecus.filter(p => {
      const q = this.filtreSearch.toLowerCase();

      const matchSearch = !this.filtreSearch ||
        p.messageId?.toLowerCase().includes(q) ||
        p.senderName?.toLowerCase().includes(q);

      const matchStatut = !this.filtreStatut || p.statut === this.filtreStatut;
      const matchDevise = !this.filtreDevise || p.devise === this.filtreDevise;
      const matchBic = !this.filtreBicExp || p.senderBic === this.filtreBicExp;
      const matchDateDu = !this.filtreDateDu ||
        (!!p.dateValeur && new Date(p.dateValeur) >= new Date(this.filtreDateDu));

      return matchSearch && matchStatut && matchDevise && matchBic && matchDateDu;
    });
  }

  get bicExpediteursDistincts(): string[] {
    return [...new Set(this.paiementsRecus.map(p => p.senderBic).filter(Boolean))];
  }

  get devisesDistinctes(): string[] {
    return [...new Set(this.paiementsRecus.map(p => p.devise).filter(Boolean))];
  }

  resetFiltres(): void {
    this.filtreSearch = '';
    this.filtreStatut = '';
    this.filtreDevise = '';
    this.filtreBicExp = '';
    this.filtreDateDu = '';
    this.filtreDateAu = '';
  }

  get paiementsEmisFiltres(): RecapMg[] {
    return this.paiementsEmis.filter(p => {
      const q = this.filtreEmisSearch.toLowerCase();

      const matchSearch = !this.filtreEmisSearch ||
        p.messageId?.toLowerCase().includes(q) ||
        p.senderName?.toLowerCase().includes(q) ||
        p.receiverName?.toLowerCase().includes(q);

      const matchStatut = !this.filtreEmisStatut || p.statut === this.filtreEmisStatut;
      const matchDevise = !this.filtreEmisDevise || p.devise === this.filtreEmisDevise;
      const matchBic = !this.filtreEmisBicExp || p.senderBic === this.filtreEmisBicExp;
      const matchDateDu = !this.filtreEmisDateDu ||
        (!!p.dateValeur && new Date(p.dateValeur) >= new Date(this.filtreEmisDateDu));

      return matchSearch && matchStatut && matchDevise && matchBic && matchDateDu;
    });
  }

  get bicExpediteursEmisDistincts(): string[] {
    return [...new Set(this.paiementsEmis.map(p => p.senderBic).filter(Boolean))];
  }

  get devisesEmisDistinctes(): string[] {
    return [...new Set(this.paiementsEmis.map(p => p.devise).filter(Boolean))];
  }

  resetFiltresEmis(): void {
    this.filtreEmisSearch = '';
    this.filtreEmisStatut = '';
    this.filtreEmisDevise = '';
    this.filtreEmisBicExp = '';
    this.filtreEmisDateDu = '';
  }

  get historiqueFiltres(): HistoriqueItem[] {
    return this.historiqueReel.filter(h => {
      const q = this.filtreHistoriqueSearch.toLowerCase();

      const matchSearch = !this.filtreHistoriqueSearch ||
        h.messageId?.toLowerCase().includes(q) ||
        h.senderBic?.toLowerCase().includes(q) ||
        h.receiverBic?.toLowerCase().includes(q);

      const matchType = !this.filtreHistoriqueType || h.type === this.filtreHistoriqueType;
      const matchStatut = !this.filtreHistoriqueStatut || h.statut === this.filtreHistoriqueStatut;

      return matchSearch && matchType && matchStatut;
    });
  }

  resetFiltresHistorique(): void {
    this.filtreHistoriqueSearch = '';
    this.filtreHistoriqueType = '';
    this.filtreHistoriqueStatut = '';
  }

  get historiquePacsFiltres(): RecapMg[] {
    return this.historiquePacs.filter(p => {
      const q = this.filtreHistPacsSearch.toLowerCase();

      const matchSearch = !this.filtreHistPacsSearch ||
        p.messageId?.toLowerCase().includes(q) ||
        p.senderBic?.toLowerCase().includes(q) ||
        p.receiverBic?.toLowerCase().includes(q);

      const matchDir = !this.filtreHistPacsDirection || p.typeMsg === this.filtreHistPacsDirection;
      const effectiveType = p.msgType || 'pacs.008';
      const matchType = !this.filtreHistPacsType || effectiveType === this.filtreHistPacsType;
      const matchStatut = !this.filtreHistPacsStatut || p.statut === this.filtreHistPacsStatut;

      return matchSearch && matchDir && matchType && matchStatut;
    });
  }

  resetFiltresHistPacs(): void {
    this.filtreHistPacsSearch = '';
    this.filtreHistPacsDirection = '';
    this.filtreHistPacsType = '';
    this.filtreHistPacsStatut = '';
  }

  get paiementsAnnulables(): RecapMg[] {
    return this.paiementsEmis.filter(p => p.statut === 'PDNG' || !p.statut);
  }

  get filteredAnnulations(): Camt056[] {
    if (!this.searchAnnulations) return this.camt056List;

    const q = this.searchAnnulations.toLowerCase();

    return this.camt056List.filter(c =>
      c.messageId?.toLowerCase().includes(q) ||
      c.uetr?.toLowerCase().includes(q) ||
      c.originalMsgId?.toLowerCase().includes(q)
    );
  }

  get nbEntrantsEnAttente(): number {
    return this.paiementsEnAttente.length;
  }

  get nbAnnulationsPdng(): number {
    return this.camt056List.filter(c => c.statut === 'PDNG').length;
  }

  get pacs002Emis(): HistoriqueItem[] {
    return this.historiqueReel.filter(h => h.type === 'pacs.002');
  }

  getStatutLabel(s: StatutISO): string {
    return ({
      PDNG: 'PDNG — En attente',
      ACCP: 'ACCP — Accepté',
      ACSP: 'ACSP — En cours',
      ACSC: 'ACSC — Crédit OK',
      RJCT: 'RJCT — Rejeté',
      CANC: 'CANC — Annulé'
    } as any)[s] || s;
  }

  getStatutClass(s: string): string {
    return ({
      PDNG: 'badge-pdng',
      ACCP: 'badge-accp',
      ACSP: 'badge-acsp',
      ACSC: 'badge-acsc',
      RJCT: 'badge-rjct',
      CANC: 'badge-canc'
    } as any)[s] || '';
  }

  getAnnulStatutClass(s: string): string {
    return ({
      ACCP: 'badge-acsc',
      PDNG: 'badge-pdng',
      RJCT: 'badge-rjct'
    } as any)[s] || '';
  }

  getAnnulStatutLabel(s: string): string {
    return ({
      ACCP: 'ACCP — Acceptée',
      PDNG: 'PDNG — En attente',
      RJCT: 'RJCT — Refusée'
    } as any)[s] || s;
  }

  getMotifRejetLabel(m: MotifRejet | undefined): string {
    if (!m) return '';

    return ({
      AC01: 'AC01 — IBAN incorrect',
      AC04: 'AC04 — Compte clôturé',
      AG01: 'AG01 — Banque ne traite pas',
      FF01: 'FF01 — Code invalide',
      MS03: 'MS03 — Non spécifié',
      NARR: 'NARR — Voir détail'
    } as any)[m] || m;
  }

  getMotifRefusCamtLabel(m: MotifRefusCamt | undefined): string {
    if (!m) return '';

    return ({
      LEGL: 'LEGL — Raison légale',
      CUST: 'CUST — Décision client',
      AGET: 'AGET — Décision agent',
      NARR: 'NARR — Voir détail'
    } as any)[m] || m;
  }

  getDelaiClass(h: number | undefined): string {
    if (!h) return '';
    return h <= 24 ? 'delai-ok' : 'delai-retard';
  }

  getDelaiLabel(h: number | undefined): string {
    if (!h) return '—';
    if (h < 1) return '< 1h';
    return `${h}h`;
  }

  getMsgTypeClass(t: string): string {
    return t.startsWith('pacs')
      ? 'badge-msg-pacs'
      : t === 'camt.056'
      ? 'badge-msg-camt056'
      : 'badge-msg-camt029';
  }

  get filteredTransactions(): Transaction[] {
    return this.transactions;
  }

  get paginatedTransactions(): Transaction[] {
    const s = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(s, s + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTransactions.length / this.pageSize));
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  get allCharges(): Charge[] {
    return this.selectedTransaction?.agents.flatMap(a => a.charges) ?? [];
  }

  totalChargesAll(): number {
    return this.allCharges.reduce((s, c) => s + c.montant, 0);
  }

  get statutsRepartition(): { statut: StatutISO; count: number; pct: number }[] {
    return this.repartitionStatuts.map(r => ({
      statut: r.statut as StatutISO,
      count: r.count,
      pct: r.pct
    }));
  }

  traiterPaiement(p: RecapMg): void {
    this.ouvrirModalTraitement(p);
  }

  annulerConfirmation(): void {
    this.confirmationUetr = '';
    this.confirmationTransaction = null;
  }

  toggleFormInitiation(): void {
    this.showFormInitiation = !this.showFormInitiation;
  }

  initierPaiement(): void {
    this.showFormInitiation = false;
    this.nouveauPaiement = {
      bicDestinataire: '',
      iban: '',
      montant: 0,
      devise: 'TND',
      typeCharges: 'SHA',
      motif: ''
    };
    this.displayToast('pacs.008 initié', 'success');
  }

  displayToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  formatMontant(n: number | undefined): string {
    return n?.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) || '0,00';
  }
}
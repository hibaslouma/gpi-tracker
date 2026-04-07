import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RecapMgService, RecapMg, BackofficeStats, HistoriqueItem } from '../../services/recap-mg.service';

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
export interface Historique {
  type: 'pacs.008' | 'pacs.002' | 'camt.056' | 'camt.029';
  reference: string; uetr: string; bicEmetteur: string; bicRecepteur: string;
  montant: number; devise: string; date: string; totalCharges: number; statutISO: StatutISO;
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
    private recapMgService: RecapMgService
  ) {}

  activeTab = 'dashboard';
  selectedTransaction: Transaction | null = null;

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;

  filterStatut = '';
  filterDevise = '';
  filterDate = '';

  confirmationUetr = '';
  confirmationNouveauStatut: StatutISO = 'ACCP';
  confirmationMotifRejet: MotifRejet = 'AC01';
  confirmationMotifRejetDetail = '';
  confirmationTransaction: Transaction | null = null;

  annulationUetr = '';
  annulationMotif = 'Erreur Beneficiaire';
  annulationRaison = '';
  annulationMessageId = '';

  searchAnnulations = '';
  searchHistorique = '';
  searchEntrants = '';

  currentPage = 1;
  pageSize = 10;

  showFormInitiation = false;
  nouveauPaiement: NouveauPaiement = {
    bicDestinataire: '', iban: '', montant: 0,
    devise: 'TND', typeCharges: 'SHA', motif: ''
  };

  transactions: Transaction[] = [];
  paiementsEntrants: PaiementEntrant[] = [];
  paiementsRecus: RecapMg[] = [];
  paiementsEmis: RecapMg[] = [];
  stats: BackofficeStats = {
    totalRecus: 0, enAttente: 0, acceptes: 0, rejetes: 0,
    totalEmis: 0, emisEnAttente: 0, emisAcceptes: 0, emisRejetes: 0
  };
  historiqueReel: HistoriqueItem[] = [];
  selectedMessageId = '';
  selectedRecapId: number | null = null;
  filtreSearch = '';
  filtreStatut = '';
  filtreDevise = '';
  filtreBicExp = '';
  filtreDateDu = '';
  filtreDateAu = '';
  filtreHistoriqueSearch = '';
  filtreHistoriqueType = '';
  filtreHistoriqueStatut = '';
  annulations: Annulation[] = [];
  historique: Historique[] = [];
  userName = '';
  userInitials = '';

  // ── Data Loading ───────────────────────────────────────────
  loadPaiementsRecus(): void {
    this.recapMgService.getPaiementsRecus().subscribe({
      next: (data) => { this.paiementsRecus = [...data]; },
      error: (err) => console.error('Erreur chargement paiements reçus:', err)
    });
  }

  loadPaiementsEmis(): void {
    this.recapMgService.getPaiementsEmis().subscribe({
      next: (data) => { this.paiementsEmis = [...data]; },
      error: (err) => console.error('Erreur chargement paiements émis:', err)
    });
  }

  loadStats(): void {
    this.recapMgService.getStats().subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Erreur stats:', err)
    });
  }

  loadHistorique(): void {
    this.recapMgService.getHistorique().subscribe({
      next: (data) => this.historiqueReel = data,
      error: (err) => console.error('Erreur historique:', err)
    });
  }

  ngOnInit(): void {
    this.loadUserFromToken();
    this.loadPaiementsRecus();
    this.loadPaiementsEmis();
    this.loadStats();
    this.loadHistorique();

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

  // ── Navigation ─────────────────────────────────────────────
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

  ouvrirDetailLigne(t: Transaction): void { this.selectedTransaction = t; }
  ouvrirDetailDashboard(t: Transaction): void { this.activeTab = 'vue-transactionnelle'; this.selectedTransaction = t; }

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
      } catch (e) {
        this.userName = 'Utilisateur';
        this.userInitials = 'U';
      }
    }
  }

  // ── Getters Dashboard ──────────────────────────────────────
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

  // ── Getters Filtres pacs.008 ───────────────────────────────
  get paiementsRecusFiltres(): RecapMg[] {
    return this.paiementsRecus.filter(p => {
      const matchSearch = !this.filtreSearch ||
        p.messageId?.toLowerCase().includes(this.filtreSearch.toLowerCase()) ||
        p.senderName?.toLowerCase().includes(this.filtreSearch.toLowerCase());
      const matchStatut = !this.filtreStatut || p.statut === this.filtreStatut;
      const matchDevise = !this.filtreDevise || p.devise === this.filtreDevise;
      const matchBic = !this.filtreBicExp || p.senderBic === this.filtreBicExp;
      const matchDateDu = !this.filtreDateDu ||
        new Date(p.dateValeur) >= new Date(this.filtreDateDu);
      return matchSearch && matchStatut && matchDevise && matchBic && matchDateDu;
    });
  }

  get bicExpediteursDistincts(): string[] {
    return [...new Set(this.paiementsRecus.map(p => p.senderBic).filter(b => !!b))];
  }

  get devisesDistinctes(): string[] {
    return [...new Set(this.paiementsRecus.map(p => p.devise).filter(d => !!d))];
  }

  resetFiltres(): void {
    this.filtreSearch = '';
    this.filtreStatut = '';
    this.filtreDevise = '';
    this.filtreBicExp = '';
    this.filtreDateDu = '';
    this.filtreDateAu = '';
  }

  // ── Getters pacs.002 ───────────────────────────────────────
  get pacs002Emis(): HistoriqueItem[] {
    return this.historiqueReel.filter(h => h.type === 'pacs.002');
  }

  // ── Getters Historique ─────────────────────────────────────
  get historiqueFiltres(): HistoriqueItem[] {
    return this.historiqueReel.filter(h => {
      const matchSearch = !this.filtreHistoriqueSearch ||
        h.messageId?.toLowerCase().includes(this.filtreHistoriqueSearch.toLowerCase()) ||
        h.senderBic?.toLowerCase().includes(this.filtreHistoriqueSearch.toLowerCase()) ||
        h.receiverBic?.toLowerCase().includes(this.filtreHistoriqueSearch.toLowerCase());
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

  // ── Getters camt.056 ───────────────────────────────────────
  get paiementsAnnulables(): RecapMg[] {
    return this.paiementsRecus.filter(p => p.statut === 'PDNG' || !p.statut);
  }

  // ── Traitement pacs.008 ────────────────────────────────────
  traiterPaiement(p: RecapMg): void {
    this.selectedMessageId = p.messageId;
    this.selectedRecapId = p.id;
    this.setActiveTab('confirmation');
  }

  rejeterPaiementRecu(p: RecapMg, motif: string): void {
    this.recapMgService.updateStatut(p.id, 'RJCT', motif).subscribe({
      next: () => {
        p.statut = 'RJCT';
        p.motifRejet = motif;
        this.loadStats();
        this.displayToast('Paiement rejeté — pacs.002 RJCT généré', 'error');
      },
      error: () => this.displayToast('Erreur rejet', 'error')
    });
  }

  // ── Génération pacs.002 ────────────────────────────────────
  genererEtEnvoyer(): void {
    if (!this.selectedMessageId || !this.selectedRecapId) {
      this.displayToast('Veuillez sélectionner un paiement depuis Paiements Entrants', 'error');
      return;
    }
    this.recapMgService.updateStatut(
      this.selectedRecapId!,
      this.confirmationNouveauStatut,
      this.confirmationNouveauStatut === 'RJCT' ? this.confirmationMotifRejet : undefined
    ).subscribe({
      next: () => {
        this.loadStats();
        this.loadPaiementsRecus();
        this.loadHistorique();
        this.selectedMessageId = '';
        this.selectedRecapId = null;
        this.displayToast(`pacs.002 généré — statut ${this.confirmationNouveauStatut}`, 'success');
        setTimeout(() => {
          this.loadPaiementsRecus();
          this.setActiveTab('entrants');
        }, 1000);
      },
      error: () => this.displayToast('Erreur lors de la mise à jour du statut', 'error')
    });
  }

  annulerConfirmation(): void {
    this.confirmationUetr = '';
    this.confirmationTransaction = null;
  }

  rechercherTransactionConfirmation(): void {
    if (!this.confirmationUetr.trim()) { this.displayToast('Veuillez selectionner un UETR', 'error'); return; }
    const found = this.transactions.find(t => t.uetr === this.confirmationUetr.trim());
    if (found) { this.confirmationTransaction = found; this.displayToast('Transaction chargee', 'success'); }
    else { this.confirmationTransaction = null; this.displayToast('Aucune transaction trouvee', 'error'); }
  }

  // ── camt.056 ───────────────────────────────────────────────
  envoyerAnnulation(): void {
    if (!this.annulationMessageId.trim()) {
      this.displayToast('Veuillez sélectionner un paiement', 'error');
      return;
    }
    const p = this.paiementsRecus.find(x => x.messageId === this.annulationMessageId);
    const ref = `ANN-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;
    this.annulations.unshift({
      reference: ref,
      uetr: this.annulationMessageId,
      bicEmetteur: p?.senderBic || 'BIATTNTT',
      motif: this.annulationMotif,
      motifDetail: this.annulationRaison,
      date: new Date().toLocaleDateString('fr-FR'),
      statutReponse: 'PDNG',
      reponse: 'En attente de reponse'
    });
    this.annulationMessageId = '';
    this.annulationRaison = '';
    this.displayToast(`camt.056 envoyé — ref ${ref}`, 'success');
  }

  // ── Actions statiques ──────────────────────────────────────
  accepterPaiement(p: PaiementEntrant): void {
    p.statutISO = 'ACSC';
    this.displayToast(`Paiement accepte — pacs.002 ACSC envoye`, 'success');
  }

  rejeterPaiement(p: PaiementEntrant, motif: MotifRejet): void {
    p.statutISO = 'RJCT';
    p.motifRejet = motif;
    this.displayToast(`Paiement rejete — pacs.002 RJCT envoye (${motif})`, 'error');
  }

  toggleFormInitiation(): void { this.showFormInitiation = !this.showFormInitiation; }

  initierPaiement(): void {
    const { bicDestinataire, iban, montant, devise, motif } = this.nouveauPaiement;
    if (!bicDestinataire || !iban || !montant || !motif) {
      this.displayToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    this.showFormInitiation = false;
    this.nouveauPaiement = { bicDestinataire: '', iban: '', montant: 0, devise: 'TND', typeCharges: 'SHA', motif: '' };
    this.displayToast(`pacs.008 initié`, 'success');
  }

  // ── Statuts ISO ────────────────────────────────────────────
  getStatutLabel(s: StatutISO): string {
    return ({ PDNG: 'PDNG — En attente', ACCP: 'ACCP — Accepte', ACSP: 'ACSP — En cours', ACSC: 'ACSC — Credit OK', RJCT: 'RJCT — Rejete', CANC: 'CANC — Annule' } as any)[s] || s;
  }
  getStatutLabelCourt(s: StatutISO): string {
    return ({ PDNG: 'PDNG', ACCP: 'ACCP', ACSP: 'ACSP', ACSC: 'ACSC', RJCT: 'RJCT', CANC: 'CANC' } as any)[s] || s;
  }
  getStatutClass(s: string): string {
    return ({ PDNG: 'badge-pdng', ACCP: 'badge-accp', ACSP: 'badge-acsp', ACSC: 'badge-acsc', RJCT: 'badge-rjct', CANC: 'badge-canc' } as any)[s] || '';
  }
  getStatutDesc(s: StatutISO): string {
    return ({ PDNG: 'En attente de traitement', ACCP: 'Accepte par la banque', ACSP: 'Reglement en cours', ACSC: 'Credit confirme', RJCT: 'Rejete', CANC: 'Annule' } as any)[s] || '';
  }

  // ── Motifs ─────────────────────────────────────────────────
  getMotifRejetLabel(m: MotifRejet | undefined): string {
    if (!m) return '';
    return ({ AC01: 'AC01 — IBAN incorrect', AC04: 'AC04 — Compte cloture', AG01: 'AG01 — Banque ne traite pas', FF01: 'FF01 — Code operation invalide', MS03: 'MS03 — Motif non specifie', NARR: 'NARR — Voir detail' } as any)[m] || m;
  }
  getMotifRefusCamtLabel(m: MotifRefusCamt | undefined): string {
    if (!m) return '';
    return ({ LEGL: 'LEGL — Raison legale', CUST: 'CUST — Decision client', AGET: 'AGET — Decision agent', NARR: 'NARR — Voir detail' } as any)[m] || m;
  }

  // ── Helpers ────────────────────────────────────────────────
  getDelaiClass(h: number | undefined): string {
    if (!h) return ''; return h <= 24 ? 'delai-ok' : 'delai-retard';
  }
  getDelaiLabel(h: number | undefined): string {
    if (!h) return '—'; if (h < 1) return '< 1h'; return `${h}h`;
  }
  getRoleLabel(role: string): string {
    return ({ emetteur: 'Emetteur', intermediaire: 'Intermediaire', recepteur: 'Recepteur' } as any)[role] || role;
  }
  getAgentStatutClass(s: string): string {
    return ({ confirme: 'agent-confirme', 'en-transit': 'agent-transit', 'en-attente': 'agent-attente' } as any)[s] || '';
  }
  get allCharges(): Charge[] { return this.selectedTransaction?.agents.flatMap(a => a.charges) ?? []; }
  totalChargesAll(): number { return this.allCharges.reduce((s, c) => s + c.montant, 0); }

  // ── Filtres anciens ───────────────────────────────────────
  get filteredTransactions(): Transaction[] {
    return this.transactions.filter(t => {
      const matchStatut = !this.filterStatut || t.statutISO === this.filterStatut;
      const matchDevise = !this.filterDevise || t.devise === this.filterDevise;
      return matchStatut && matchDevise;
    });
  }
  get paginatedTransactions(): Transaction[] {
    const s = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(s, s + this.pageSize);
  }
  get totalPages(): number { return Math.ceil(this.filteredTransactions.length / this.pageSize); }
  get totalPagesArray(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }

  get filteredAnnulations(): Annulation[] {
    if (!this.searchAnnulations) return this.annulations;
    const q = this.searchAnnulations.toLowerCase();
    return this.annulations.filter(a => a.reference.toLowerCase().includes(q) || a.uetr.toLowerCase().includes(q));
  }

  // ── Helpers annulations ────────────────────────────────────
  getAnnulStatutClass(s: string): string { return ({ ACCP: 'badge-acsc', PDNG: 'badge-pdng', RJCT: 'badge-rjct' } as any)[s] || ''; }
  getAnnulStatutLabel(s: string): string { return ({ ACCP: 'ACCP — Acceptee', PDNG: 'PDNG — En attente', RJCT: 'RJCT — Refusee' } as any)[s] || s; }
  getMsgTypeClass(t: string): string { return t.startsWith('pacs') ? 'badge-msg-pacs' : t === 'camt.056' ? 'badge-msg-camt056' : 'badge-msg-camt029'; }

  // ── Getters stats ──────────────────────────────────────────
  get nbEntrantsEnAttente(): number { return this.paiementsEnAttente.length; }
  get nbAnnulationsPdng(): number { return this.annulations.filter(a => a.statutReponse === 'PDNG').length; }

  // ── Répartition statuts ────────────────────────────────────
  get statutsRepartition(): { statut: StatutISO; count: number; pct: number }[] {
    return this.repartitionStatuts.map(r => ({
      statut: r.statut as StatutISO,
      count: r.count,
      pct: r.pct
    }));
  }

  // ── Toast ──────────────────────────────────────────────────
  displayToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }

  formatMontant(n: number): string {
    return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
  }
}
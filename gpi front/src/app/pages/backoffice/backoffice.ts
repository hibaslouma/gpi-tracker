import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RecapMgService, RecapMg } from '../../services/recap-mg.service';

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
  confirmationNouveauStatut: StatutISO = 'ACSC';
  confirmationMotifRejet: MotifRejet = 'AC01';
  confirmationMotifRejetDetail = '';
  confirmationTransaction: Transaction | null = null;

  annulationUetr = '';
  annulationMotif = 'Erreur Beneficiaire';
  annulationRaison = '';

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
  annulations: Annulation[] = [];
  historique: Historique[] = [];

  userName = '';
  userInitials = '';
  loadPaiementsRecus(): void {
  this.recapMgService.getPaiementsRecus().subscribe({
    next: (data) => this.paiementsRecus = data,
    error: (err) => console.error('Erreur chargement paiements:', err)
  });
}

  ngOnInit(): void {
    this.loadUserFromToken();
    this.loadPaiementsRecus();

    // Lire le tab depuis l'URL à chaque changement
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

  private loadUserFromToken(): void {
    const token = localStorage.getItem('token');
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

  // ── Navigation ─────────────────────────────────────────────
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.selectedTransaction = null;
    this.router.navigate(['/backoffice'], { queryParams: { tab } });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigateByUrl('/auth/login');
  }

  ouvrirDetailLigne(t: Transaction): void { this.selectedTransaction = t; }
  ouvrirDetailDashboard(t: Transaction): void { this.activeTab = 'vue-transactionnelle'; this.selectedTransaction = t; }

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

  // ── Delai GPI ──────────────────────────────────────────────
  getDelaiClass(h: number | undefined): string {
    if (!h) return ''; return h <= 24 ? 'delai-ok' : 'delai-retard';
  }
  getDelaiLabel(h: number | undefined): string {
    if (!h) return '—'; if (h < 1) return '< 1h'; return `${h}h`;
  }

  // ── Helpers agents ─────────────────────────────────────────
  getRoleLabel(role: string): string {
    return ({ emetteur: 'Emetteur', intermediaire: 'Intermediaire', recepteur: 'Recepteur' } as any)[role] || role;
  }
  getAgentStatutClass(s: string): string {
    return ({ confirme: 'agent-confirme', 'en-transit': 'agent-transit', 'en-attente': 'agent-attente' } as any)[s] || '';
  }
  get allCharges(): Charge[] { return this.selectedTransaction?.agents.flatMap(a => a.charges) ?? []; }
  totalChargesAll(): number { return this.allCharges.reduce((s, c) => s + c.montant, 0); }

  // ── Filtres & pagination ───────────────────────────────────
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

  get filteredEntrants(): PaiementEntrant[] {
    if (!this.searchEntrants) return this.paiementsEntrants;
    const q = this.searchEntrants.toLowerCase();
    return this.paiementsEntrants.filter(p =>
      p.bicEmetteur.toLowerCase().includes(q) || p.uetr.toLowerCase().includes(q) || p.motif.toLowerCase().includes(q)
    );
  }
  get filteredAnnulations(): Annulation[] {
    if (!this.searchAnnulations) return this.annulations;
    const q = this.searchAnnulations.toLowerCase();
    return this.annulations.filter(a => a.reference.toLowerCase().includes(q) || a.uetr.toLowerCase().includes(q));
  }
  get filteredHistorique(): Historique[] {
    if (!this.searchHistorique) return this.historique;
    const q = this.searchHistorique.toLowerCase();
    return this.historique.filter(h => h.type.includes(q) || h.reference.toLowerCase().includes(q) || h.uetr.toLowerCase().includes(q));
  }

  // ── Actions paiements entrants ─────────────────────────────
  accepterPaiement(p: PaiementEntrant): void {
    p.statutISO = 'ACSC';
    this.historique.unshift({ type: 'pacs.002', reference: `BIA-ACK-${Date.now().toString().slice(-4)}`, uetr: p.uetr, bicEmetteur: 'BIATTNTTXXX', bicRecepteur: p.bicEmetteur, montant: p.montant, devise: p.devise, date: new Date().toLocaleDateString('fr-FR'), totalCharges: 0, statutISO: 'ACSC' });
    this.displayToast(`Paiement ${p.uetr.slice(0, 8)}... accepte — pacs.002 ACSC envoye`, 'success');
  }
  rejeterPaiement(p: PaiementEntrant, motif: MotifRejet): void {
    p.statutISO = 'RJCT';
    p.motifRejet = motif;
    this.historique.unshift({ type: 'pacs.002', reference: `BIA-REJ-${Date.now().toString().slice(-4)}`, uetr: p.uetr, bicEmetteur: 'BIATTNTTXXX', bicRecepteur: p.bicEmetteur, montant: p.montant, devise: p.devise, date: new Date().toLocaleDateString('fr-FR'), totalCharges: 0, statutISO: 'RJCT' });
    this.displayToast(`Paiement rejete — pacs.002 RJCT envoye (${motif})`, 'error');
  }

  // ── Confirmation pacs.002 ──────────────────────────────────
  rechercherTransactionConfirmation(): void {
    if (!this.confirmationUetr.trim()) { this.displayToast('Veuillez selectionner un UETR', 'error'); return; }
    const found = this.transactions.find(t => t.uetr === this.confirmationUetr.trim());
    if (found) { this.confirmationTransaction = found; this.displayToast('Transaction chargee', 'success'); }
    else { this.confirmationTransaction = null; this.displayToast('Aucune transaction trouvee', 'error'); }
  }
  genererEtEnvoyer(): void {
    if (!this.confirmationTransaction) { this.displayToast('Veuillez selectionner un UETR', 'error'); return; }
    const idx = this.transactions.findIndex(t => t.uetr === this.confirmationTransaction!.uetr);
    if (idx !== -1) {
      this.transactions[idx].statutISO = this.confirmationNouveauStatut;
      if (this.confirmationNouveauStatut === 'RJCT') {
        this.transactions[idx].motifRejet = this.confirmationMotifRejet;
        this.transactions[idx].motifRejetDetail = this.confirmationMotifRejetDetail;
      }
      this.transactions[idx].messages.push({ type: 'pacs.002', dateHeure: new Date().toLocaleDateString('fr-FR'), statut: this.confirmationNouveauStatut, ref: `BIAT-CONF-${Date.now().toString().slice(-4)}`, detail: `Statut mis a jour: ${this.confirmationNouveauStatut}` });
    }
    this.displayToast(`pacs.002 genere — statut ${this.confirmationNouveauStatut}`, 'success');
    this.confirmationTransaction = null; this.confirmationUetr = '';
  }
  annulerConfirmation(): void { this.confirmationUetr = ''; this.confirmationTransaction = null; }

  // ── Annulation camt.056 ────────────────────────────────────
  envoyerAnnulation(): void {
    if (!this.annulationUetr.trim()) { this.displayToast('Veuillez selectionner un UETR', 'error'); return; }
    const t = this.transactions.find(x => x.uetr === this.annulationUetr);
    if (t && (t.statutISO === 'ACSC' || t.statutISO === 'ACSP')) {
      this.displayToast('Impossible — transaction deja reglee (ACSC/ACSP)', 'error'); return;
    }
    const ref = `ANN-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;
    this.annulations.unshift({ reference: ref, uetr: this.annulationUetr, bicEmetteur: 'BIATTNTTXXX', motif: this.annulationMotif, motifDetail: this.annulationRaison, date: new Date().toLocaleDateString('fr-FR'), statutReponse: 'PDNG', reponse: 'En attente de reponse' });
    this.historique.unshift({ type: 'camt.056', reference: ref, uetr: this.annulationUetr, bicEmetteur: 'BIATTNTTXXX', bicRecepteur: t?.bicRecepteur || '—', montant: t?.montant || 0, devise: t?.devise || 'TND', date: new Date().toLocaleDateString('fr-FR'), totalCharges: 0, statutISO: 'PDNG' });
    this.annulationUetr = ''; this.annulationRaison = '';
    this.displayToast(`camt.056 envoye — ref ${ref}`, 'success');
  }

  // ── Initiation pacs.008 ────────────────────────────────────
  toggleFormInitiation(): void { this.showFormInitiation = !this.showFormInitiation; }
  initierPaiement(): void {
    const { bicDestinataire, iban, montant, devise, typeCharges, motif } = this.nouveauPaiement;
    if (!bicDestinataire || !iban || !montant || !motif) { this.displayToast('Veuillez remplir tous les champs obligatoires', 'error'); return; }
    const uetr = `biat-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}`;
    const ref = `BIAT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    this.transactions.unshift({
      statutISO: 'PDNG', uetr, bicEmetteur: 'BIATTNTTXXX', bicRecepteur: bicDestinataire,
      montant, devise, date: new Date().toLocaleDateString('fr-FR'), delaiGPI: 0,
      agents: [{ bic: 'BIATTNTTXXX', pays: 'Tunisie', role: 'emetteur', statut: 'confirme', dateHeure: new Date().toLocaleString('fr-FR'), ref, charges: [] }],
      messages: [{ type: 'pacs.008', dateHeure: new Date().toLocaleString('fr-FR'), statut: 'PDNG', ref, detail: motif }]
    });
    this.historique.unshift({ type: 'pacs.008', reference: ref, uetr, bicEmetteur: 'BIATTNTTXXX', bicRecepteur: bicDestinataire, montant, devise, date: new Date().toLocaleDateString('fr-FR'), totalCharges: 0, statutISO: 'PDNG' });
    this.showFormInitiation = false;
    this.nouveauPaiement = { bicDestinataire: '', iban: '', montant: 0, devise: 'TND', typeCharges: 'SHA', motif: '' };
    this.displayToast(`pacs.008 envoye — UETR ${uetr.slice(0, 16)}...`, 'success');
  }

  // ── Helpers annulations ────────────────────────────────────
  getAnnulStatutClass(s: string): string { return ({ ACCP: 'badge-acsc', PDNG: 'badge-pdng', RJCT: 'badge-rjct' } as any)[s] || ''; }
  getAnnulStatutLabel(s: string): string { return ({ ACCP: 'ACCP — Acceptee', PDNG: 'PDNG — En attente', RJCT: 'RJCT — Refusee' } as any)[s] || s; }
  getMsgTypeClass(t: string): string { return t.startsWith('pacs') ? 'badge-msg-pacs' : t === 'camt.056' ? 'badge-msg-camt056' : 'badge-msg-camt029'; }

  // ── Toast ──────────────────────────────────────────────────
  displayToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }
  formatMontant(n: number): string { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ── Getters stats ──────────────────────────────────────────
  get nbEntrantsEnAttente(): number { return this.paiementsEntrants.filter(p => p.statutISO === 'PDNG').length; }
  get nbAnnulationsPdng(): number { return this.annulations.filter(a => a.statutReponse === 'PDNG').length; }
  get nbEnCours(): number { return this.transactions.filter(t => ['PDNG', 'ACCP', 'ACSP'].includes(t.statutISO)).length; }
  get nbAcsc(): number { return this.transactions.filter(t => t.statutISO === 'ACSC').length; }
  get nbRejets(): number { return this.transactions.filter(t => t.statutISO === 'RJCT').length; }

  get statutsRepartition(): { statut: StatutISO; count: number; pct: number }[] {
    const total = this.transactions.length;
    if (total === 0) return [];
    const statuts: StatutISO[] = ['PDNG', 'ACCP', 'ACSP', 'ACSC', 'RJCT', 'CANC'];
    return statuts
      .map(s => ({ statut: s, count: this.transactions.filter(t => t.statutISO === s).length, pct: 0 }))
      .filter(item => item.count > 0)
      .map(item => ({ ...item, pct: Math.round((item.count / total) * 100) }));
  }
}
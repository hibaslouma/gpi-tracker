import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// ─── Statuts ISO MX ──────────────────────────────────────────
export type StatutISO = 'PDNG' | 'ACCP' | 'ACSP' | 'ACSC' | 'RJCT' | 'CANC';

// ─── Codes motif rejet pacs.002 ──────────────────────────────
export type MotifRejet = 'AC01' | 'AC04' | 'AG01' | 'FF01' | 'MS03' | 'NARR';

// ─── Codes motif refus camt.029 ──────────────────────────────
export type MotifRefusCamt = 'LEGL' | 'CUST' | 'AGET' | 'NARR';

export interface Charge {
  bic: string;
  pays: string;
  montant: number;
  devise: string;
  type: 'SHA' | 'OUR' | 'BEN';
}

export interface Agent {
  bic: string;
  pays: string;
  role: 'emetteur' | 'intermediaire' | 'recepteur';
  statut: 'confirme' | 'en-transit' | 'en-attente';
  dateHeure?: string;
  ref?: string;
  charges: Charge[];
}

export interface MessageTrace {
  type: 'pacs.008' | 'pacs.002' | 'camt.056' | 'camt.029';
  dateHeure: string;
  statut: StatutISO;
  ref: string;
  detail?: string;
}

export interface Transaction {
  statutISO: StatutISO;
  uetr: string;
  bicEmetteur: string;
  bicRecepteur: string;
  montant: number;
  devise: string;
  date: string;
  agents: Agent[];
  messages: MessageTrace[];
  motifRejet?: MotifRejet;
  motifRejetDetail?: string;
  delaiGPI?: number; // heures ecoulees
}

export interface PaiementEntrant {
  statutISO: StatutISO;
  uetr: string;
  bicEmetteur: string;
  montant: number;
  devise: string;
  date: string;
  motif: string;
  typeCharges: 'SHA' | 'OUR' | 'BEN';
  motifRejet?: MotifRejet;
  motifRejetDetail?: string;
}

export interface Annulation {
  reference: string;
  uetr: string;
  bicEmetteur: string;
  motif: string;
  motifDetail?: string;
  date: string;
  statutReponse: 'PDNG' | 'ACCP' | 'RJCT';
  motifRefus?: MotifRefusCamt;
  reponse: string;
}

export interface Historique {
  type: 'pacs.008' | 'pacs.002' | 'camt.056' | 'camt.029';
  reference: string;
  uetr: string;
  bicEmetteur: string;
  bicRecepteur: string;
  montant: number;
  devise: string;
  date: string;
  totalCharges: number;
  statutISO: StatutISO;
}

export interface NouveauPaiement {
  bicDestinataire: string;
  iban: string;
  montant: number;
  devise: 'TND' | 'EUR' | 'USD' | 'GBP';
  typeCharges: 'SHA' | 'OUR' | 'BEN';
  motif: string;
}

@Component({
  selector: 'app-backoffice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backoffice.html',
  styleUrls: ['./backoffice.scss']
})
export class BackofficeComponent implements OnInit {

  constructor(private router: Router, private authService: AuthService) {}

  activeTab = 'vue-transactionnelle';
  selectedTransaction: Transaction | null = null;

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;

  // Filtres Vue Transactionnelle
  filterStatut = '';
  filterDevise = '';
  filterDate = '';

  // Confirmation
  confirmationUetr = '';
  confirmationNouveauStatut: StatutISO = 'ACSC';
  confirmationMotifRejet: MotifRejet = 'AC01';
  confirmationMotifRejetDetail = '';
  confirmationTransaction: Transaction | null = null;

  // Annulation
  annulationUetr = '';
  annulationMotif = 'Erreur Beneficiaire';
  annulationRaison = '';

  // Recherche
  searchAnnulations = '';
  searchHistorique = '';
  searchEntrants = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Formulaire initiation paiement
  showFormInitiation = false;
  nouveauPaiement: NouveauPaiement = {
    bicDestinataire: '', iban: '', montant: 0,
    devise: 'TND', typeCharges: 'SHA', motif: ''
  };

  // ── Transactions sortantes (pacs.008 initiés) ──────────────
  transactions: Transaction[] = [
    {
      statutISO: 'ACSC',
      uetr: 'a1b2c3d4-1111-4aaa-b111-111111111001',
      bicEmetteur: 'BIATTNTTXXX',
      bicRecepteur: 'BNPAFRPPXXX',
      montant: 85000.00, devise: 'TND', date: '15/03/2024',
      delaiGPI: 18,
      agents: [
        { bic: 'BIATTNTTXXX', pays: 'Tunisie', role: 'emetteur', statut: 'confirme', dateHeure: '15/03/2024 08:42:11', ref: 'BIAT-2024-00381', charges: [{ bic: 'BIATTNTTXXX', pays: 'Tunisie', montant: 22.00, devise: 'TND', type: 'SHA' }] },
        { bic: 'UBSWCHZHXXX', pays: 'Suisse',  role: 'intermediaire', statut: 'confirme', dateHeure: '15/03/2024 10:15:00', ref: 'UBS-2024-44210', charges: [{ bic: 'UBSWCHZHXXX', pays: 'Suisse', montant: 14.50, devise: 'TND', type: 'SHA' }] },
        { bic: 'BNPAFRPPXXX', pays: 'France',  role: 'recepteur', statut: 'confirme', dateHeure: '15/03/2024 14:22:00', ref: 'BNP-2024-77001', charges: [{ bic: 'BNPAFRPPXXX', pays: 'France', montant: 18.00, devise: 'TND', type: 'SHA' }] }
      ],
      messages: [
        { type: 'pacs.008', dateHeure: '15/03/2024 08:42:11', statut: 'ACCP', ref: 'BIAT-2024-00381', detail: 'Paiement initie' },
        { type: 'pacs.002', dateHeure: '15/03/2024 14:22:00', statut: 'ACSC', ref: 'BNP-2024-77001',  detail: 'Credit confirme par BNPAFRPPXXX' }
      ]
    },
    {
      statutISO: 'ACSP',
      uetr: 'b2c3d4e5-2222-4bbb-c222-222222222002',
      bicEmetteur: 'BIATTNTTXXX',
      bicRecepteur: 'DEUTDEDBXXX',
      montant: 210000.00, devise: 'EUR', date: '18/03/2024',
      delaiGPI: 6,
      agents: [
        { bic: 'BIATTNTTXXX', pays: 'Tunisie',   role: 'emetteur', statut: 'confirme', dateHeure: '18/03/2024 09:15:00', ref: 'BIAT-2024-00712', charges: [{ bic: 'BIATTNTTXXX', pays: 'Tunisie', montant: 35.00, devise: 'EUR', type: 'SHA' }] },
        { bic: 'UBSWCHZHXXX', pays: 'Suisse',    role: 'intermediaire', statut: 'confirme', dateHeure: '18/03/2024 11:00:00', ref: 'UBS-2024-55310', charges: [{ bic: 'UBSWCHZHXXX', pays: 'Suisse', montant: 12.00, devise: 'EUR', type: 'SHA' }] },
        { bic: 'DEUTDEDBXXX', pays: 'Allemagne', role: 'recepteur', statut: 'en-attente', dateHeure: undefined, ref: undefined, charges: [{ bic: 'DEUTDEDBXXX', pays: 'Allemagne', montant: 10.00, devise: 'EUR', type: 'SHA' }] }
      ],
      messages: [
        { type: 'pacs.008', dateHeure: '18/03/2024 09:15:00', statut: 'ACCP', ref: 'BIAT-2024-00712', detail: 'Paiement initie' },
        { type: 'pacs.002', dateHeure: '18/03/2024 11:00:00', statut: 'ACSP', ref: 'UBS-2024-55310',  detail: 'Reglement en cours' }
      ]
    },
    {
      statutISO: 'PDNG',
      uetr: 'c3d4e5f6-3333-4ccc-d333-333333333003',
      bicEmetteur: 'BIATTNTTXXX',
      bicRecepteur: 'HSBCGB2LXXX',
      montant: 50000.00, devise: 'USD', date: '20/03/2024',
      delaiGPI: 2,
      agents: [
        { bic: 'BIATTNTTXXX', pays: 'Tunisie',       role: 'emetteur', statut: 'confirme', dateHeure: '20/03/2024 07:30:00', ref: 'BIAT-2024-00155', charges: [{ bic: 'BIATTNTTXXX', pays: 'Tunisie', montant: 18.00, devise: 'USD', type: 'OUR' }] },
        { bic: 'HSBCGB2LXXX', pays: 'Royaume-Uni',  role: 'recepteur', statut: 'en-attente', dateHeure: undefined, ref: undefined, charges: [] }
      ],
      messages: [
        { type: 'pacs.008', dateHeure: '20/03/2024 07:30:00', statut: 'PDNG', ref: 'BIAT-2024-00155', detail: 'En attente de traitement' }
      ]
    },
    {
      statutISO: 'RJCT',
      uetr: 'd4e5f6a7-4444-4ddd-e444-444444444004',
      bicEmetteur: 'BIATTNTTXXX',
      bicRecepteur: 'CITIUS33XXX',
      montant: 7300.00, devise: 'USD', date: '22/03/2024',
      delaiGPI: 4,
      motifRejet: 'AC04',
      motifRejetDetail: 'Compte beneficiaire cloture',
      agents: [
        { bic: 'BIATTNTTXXX', pays: 'Tunisie',     role: 'emetteur', statut: 'confirme', dateHeure: '22/03/2024 08:10:00', ref: 'BIAT-2024-00402', charges: [{ bic: 'BIATTNTTXXX', pays: 'Tunisie', montant: 12.00, devise: 'USD', type: 'BEN' }] },
        { bic: 'CITIUS33XXX', pays: 'Etats-Unis',  role: 'recepteur', statut: 'en-attente', dateHeure: undefined, ref: undefined, charges: [] }
      ],
      messages: [
        { type: 'pacs.008', dateHeure: '22/03/2024 08:10:00', statut: 'ACCP', ref: 'BIAT-2024-00402', detail: 'Paiement initie' },
        { type: 'pacs.002', dateHeure: '22/03/2024 09:55:00', statut: 'RJCT', ref: 'CITI-REJ-00881',  detail: 'AC04 — Compte beneficiaire cloture' }
      ]
    }
  ];

  // ── Paiements entrants (pacs.008 recus) ───────────────────
  paiementsEntrants: PaiementEntrant[] = [
    {
      statutISO: 'PDNG',
      uetr: 'e5f6a7b8-5555-4eee-f555-555555555005',
      bicEmetteur: 'SGSGFRPPXXX',
      montant: 42000.00, devise: 'EUR', date: '21/03/2024 10:30',
      motif: 'Paiement fournisseur — INV-2024-0088',
      typeCharges: 'SHA'
    },
    {
      statutISO: 'PDNG',
      uetr: 'f6a7b8c9-6666-4fff-a666-666666666006',
      bicEmetteur: 'BARCGB22XXX',
      montant: 15500.00, devise: 'USD', date: '22/03/2024 14:15',
      motif: 'Remboursement contrat — CTR-44821',
      typeCharges: 'OUR'
    },
    {
      statutISO: 'ACSC',
      uetr: 'a7b8c9d0-7777-4aaa-b777-777777777007',
      bicEmetteur: 'DEUTDEDBXXX',
      montant: 98000.00, devise: 'EUR', date: '19/03/2024 09:00',
      motif: 'Virement salaires expatries Q1-2024',
      typeCharges: 'SHA'
    },
    {
      statutISO: 'RJCT',
      uetr: 'b8c9d0e1-8888-4bbb-c888-888888888008',
      bicEmetteur: 'CHASUS33XXX',
      montant: 5200.00, devise: 'USD', date: '18/03/2024 16:45',
      motif: 'Payment ref TN-20240318',
      typeCharges: 'BEN',
      motifRejet: 'AC01',
      motifRejetDetail: 'IBAN incorrect'
    }
  ];

  // ── Annulations (camt.056 / camt.029) ─────────────────────
  annulations: Annulation[] = [
    {
      reference: 'ANN-2024-001', uetr: 'd4e5f6a7-4444-4ddd', bicEmetteur: 'BIATTNTTXXX',
      motif: 'Erreur Beneficiaire', motifDetail: 'Mauvais IBAN saisi',
      date: '22/03/2024 10:00', statutReponse: 'ACCP', reponse: 'Annulation acceptee par CITIUS33XXX'
    },
    {
      reference: 'ANN-2024-002', uetr: 'b2c3d4e5-2222-4bbb', bicEmetteur: 'BIATTNTTXXX',
      motif: 'Montant Incorrect', motifDetail: 'Montant superieur au prevu',
      date: '18/03/2024 15:00', statutReponse: 'PDNG', reponse: 'En attente de reponse DEUTDEDBXXX'
    },
    {
      reference: 'ANN-2024-003', uetr: 'a1b2c3d4-1111-4aaa', bicEmetteur: 'BIATTNTTXXX',
      motif: 'Paiement en Double', motifDetail: '',
      date: '15/03/2024 16:00', statutReponse: 'RJCT', motifRefus: 'LEGL',
      reponse: 'Refus LEGL — Transaction deja reglee'
    }
  ];

  // ── Historique ─────────────────────────────────────────────
  historique: Historique[] = [
    { type: 'pacs.008', reference: 'BIAT-2024-00381', uetr: 'a1b2c3d4-1111', bicEmetteur: 'BIATTNTTXXX', bicRecepteur: 'BNPAFRPPXXX',  montant: 85000.00,  devise: 'TND', date: '15/03/2024 08:42', totalCharges: 54.50, statutISO: 'ACSC' },
    { type: 'pacs.002', reference: 'BNP-2024-77001',  uetr: 'a1b2c3d4-1111', bicEmetteur: 'BNPAFRPPXXX',  bicRecepteur: 'BIATTNTTXXX', montant: 85000.00,  devise: 'TND', date: '15/03/2024 14:22', totalCharges: 0,     statutISO: 'ACSC' },
    { type: 'pacs.008', reference: 'BIAT-2024-00712', uetr: 'b2c3d4e5-2222', bicEmetteur: 'BIATTNTTXXX', bicRecepteur: 'DEUTDEDBXXX',  montant: 210000.00, devise: 'EUR', date: '18/03/2024 09:15', totalCharges: 57.00, statutISO: 'ACSP' },
    { type: 'camt.056', reference: 'ANN-2024-001',    uetr: 'd4e5f6a7-4444', bicEmetteur: 'BIATTNTTXXX', bicRecepteur: 'CITIUS33XXX',   montant: 7300.00,   devise: 'USD', date: '22/03/2024 10:00', totalCharges: 12.00, statutISO: 'CANC' },
    { type: 'camt.029', reference: 'ANN-2024-001-R',  uetr: 'd4e5f6a7-4444', bicEmetteur: 'CITIUS33XXX',  bicRecepteur: 'BIATTNTTXXX', montant: 7300.00,   devise: 'USD', date: '22/03/2024 11:30', totalCharges: 0,     statutISO: 'CANC' }
  ];

  ngOnInit(): void {}

  // ── Navigation ─────────────────────────────────────────────
  setActiveTab(tab: string): void { this.activeTab = tab; this.selectedTransaction = null; }
  async logout(): Promise<void> { await this.authService.logout(); }
  ouvrirDetailLigne(t: Transaction): void { this.selectedTransaction = t; }

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
    if (!h) return '';
    if (h <= 24) return 'delai-ok';
    return 'delai-retard';
  }
  getDelaiLabel(h: number | undefined): string {
    if (!h) return '—';
    if (h < 1) return '< 1h';
    return `${h}h`;
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

  // ── Filtres ────────────────────────────────────────────────
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
    return this.paiementsEntrants.filter(p => p.bicEmetteur.toLowerCase().includes(q) || p.uetr.toLowerCase().includes(q) || p.motif.toLowerCase().includes(q));
  }
  get entrantsEnAttente(): number { return this.paiementsEntrants.filter(p => p.statutISO === 'PDNG').length; }

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
    this.displayToast(`Paiement ${p.uetr.slice(0,8)}... accepte — pacs.002 ACSC envoye`, 'success');
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
    const uetr = `biat-${Date.now().toString(16)}-${Math.random().toString(16).slice(2,6)}`;
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
    this.displayToast(`pacs.008 envoye — UETR ${uetr.slice(0,16)}...`, 'success');
  }

  // ── Helpers annulations ────────────────────────────────────
  getAnnulStatutClass(s: string): string { return ({ ACCP: 'badge-acsc', PDNG: 'badge-pdng', RJCT: 'badge-rjct' } as any)[s] || ''; }
  getAnnulStatutLabel(s: string): string { return ({ ACCP: 'ACCP — Acceptee', PDNG: 'PDNG — En attente', RJCT: 'RJCT — Refusee' } as any)[s] || s; }
  getMsgTypeClass(t: string): string { return t.startsWith('pacs') ? 'badge-acsp' : t === 'camt.056' ? 'badge-rjct' : 'badge-acsc'; }

  // ── Toast ──────────────────────────────────────────────────
  displayToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }
  formatMontant(n: number): string { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ── Stat badges entrants (pour sidebar badge) ─────────────
  get nbEntrantsEnAttente(): number { return this.paiementsEntrants.filter(p => p.statutISO === 'PDNG').length; }
}
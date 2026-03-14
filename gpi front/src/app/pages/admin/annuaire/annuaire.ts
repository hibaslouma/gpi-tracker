import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Bank {
  id: number;
  participant: string;
  nomBanque: string;
  paysCode: string;
  paysNom: string;
  flagUrl: string;
  bic: string;
  devises: string;
  statut: 'ACTIF' | 'INACTIF';
  cutOff: string;
  reseau: string;
}

const COUNTRIES = [
  { code: 'BE', nom: 'BELGIQUE' },
  { code: 'FR', nom: 'FRANCE' },
  { code: 'DE', nom: 'ALLEMAGNE' },
  { code: 'ES', nom: 'ESPAGNE' },
  { code: 'IT', nom: 'ITALIE' },
  { code: 'NL', nom: 'PAYS-BAS' },
  { code: 'GB', nom: 'ROYAUME-UNI' },
  { code: 'US', nom: 'ÉTATS-UNIS' },
  { code: 'JP', nom: 'JAPON' },
  { code: 'CN', nom: 'CHINE' },
  { code: 'BR', nom: 'BRÉSIL' },
  { code: 'CA', nom: 'CANADA' },
  { code: 'TN', nom: 'TUNISIE' },
  { code: 'TH', nom: 'THAÏLANDE' },
  { code: 'IN', nom: 'INDE' },
  { code: 'AU', nom: 'AUSTRALIE' },
];

const RESEAUX = [
  'SWIFT Network',
  'T2S (Target2-Securities)',
  'CHIPS (Clearing House)',
  'RTGS (Real-Time Gross Settlement)',
  'ACH (Automated Clearing House)',
  'Fedwire',
  'CIPS (Cross-border Interbank Payment System)',
  'BOJ-NET (Bank of Japan)',
];

const DEVISES_LIST = [
  'TND', 'EUR', 'USD', 'GBP', 'JPY', 'CNY',
  'CAD', 'CHF', 'AUD', 'NZD', 'SEK', 'NOK',
  'DKK', 'INR', 'BRL',
];

@Component({
  selector: 'app-annuaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire.html',
  styleUrl: './annuaire.scss'
})
export class Annuaire implements OnInit {

  // ─── État UI ──────────────────────────────────────────────
  private _searchQuery = '';
  searchCountry = '';
  currentPage = 1;
  itemsPerPage = 10;
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  selectedBank: Bank | null = null;
  countries = COUNTRIES;
  reseaux = RESEAUX;
  devises = DEVISES_LIST;

  // ─── Messages feedback (remplace alert()) ─────────────────
  formError = '';
  successMessage = '';

  // ─── Recherche avec reset pagination ──────────────────────
  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(val: string) {
    this._searchQuery = val;
    this.currentPage = 1;
  }

  // ─── Devises sélectionnées (tableau pour les checkboxes) ──
  selectedDevises: string[] = [];

  // ─── Formulaire nouvelle banque ───────────────────────────
  newBank: Partial<Bank> = this.emptyBank();

  private emptyBank(): Partial<Bank> {
    return {
      participant: '',
      nomBanque: '',
      paysCode: '',
      paysNom: '',
      flagUrl: '',
      bic: '',
      devises: '',
      statut: 'ACTIF',
      cutOff: '',
      reseau: ''
    };
  }

  // ─── Données banques ──────────────────────────────────────
  banks: Bank[] = [
    {
      id: 1,
      participant: 'BNRSIBRXXX',
      nomBanque: 'Belfius Bank',
      paysCode: 'BE',
      paysNom: 'BELGIQUE',
      flagUrl: 'https://flagcdn.com/w80/be.png',
      bic: 'BNRSIBRXXX',
      devises: 'EUR, USD',
      statut: 'ACTIF',
      cutOff: '16:00+0100',
      reseau: 'SWIFT Network'
    },
    {
      id: 2,
      participant: 'BNPAFRPPXXX',
      nomBanque: 'BNP Paribas',
      paysCode: 'FR',
      paysNom: 'FRANCE',
      flagUrl: 'https://flagcdn.com/w80/fr.png',
      bic: 'BNPAFRPPXXX',
      devises: 'EUR, USD, GBP',
      statut: 'ACTIF',
      cutOff: '17:00+0100',
      reseau: 'SWIFT Network'
    },
    {
      id: 3,
      participant: 'DEUTDEDBXXX',
      nomBanque: 'Deutsche Bank',
      paysCode: 'DE',
      paysNom: 'ALLEMAGNE',
      flagUrl: 'https://flagcdn.com/w80/de.png',
      bic: 'DEUTDEDBXXX',
      devises: 'EUR, USD, CHF',
      statut: 'INACTIF',
      cutOff: '15:30+0100',
      reseau: 'TARGET2'
    },
  ];

  // ─── Getters ──────────────────────────────────────────────
  get filteredCountries(): any[] {
    if (!this.searchCountry) return this.countries;
    return this.countries.filter(c =>
      c.code.toLowerCase().includes(this.searchCountry.toLowerCase()) ||
      c.nom.toLowerCase().includes(this.searchCountry.toLowerCase())
    );
  }

  get filteredBanks(): Bank[] {
    return this.banks.filter(b =>
      b.participant.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      b.nomBanque.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      b.paysNom.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      b.devises.toLowerCase().includes(this._searchQuery.toLowerCase())
    );
  }

  get paginatedBanks(): Bank[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredBanks.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBanks.length / this.itemsPerPage));
  }

  // CORRECTION : pages dynamiques (plus de [1,2,3] hardcodé)
  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  constructor(private router: Router) {}

  ngOnInit() {}

  // ─── Modales ──────────────────────────────────────────────
  openAddModal() {
    this.isEditing = false;
    this.selectedBank = null;
    this.newBank = this.emptyBank();
    this.selectedDevises = [];
    this.searchCountry = '';
    this.formError = '';
    this.showModal = true;
  }

  openEditModal(bank: Bank) {
    this.isEditing = true;
    this.selectedBank = bank;
    this.newBank = { ...bank };
    // Restaurer les devises cochées
    this.selectedDevises = bank.devises.split(', ').map(d => d.trim()).filter(d => d);
    this.searchCountry = '';
    this.formError = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.formError = '';
  }

  confirmDelete(bank: Bank) {
    this.selectedBank = bank;
    this.showDeleteModal = true;
  }

  deleteBank() {
    if (!this.selectedBank) return;
    this.banks = this.banks.filter(b => b.id !== this.selectedBank!.id);
    this.showDeleteModal = false;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    this.showSuccess('Banque supprimée avec succès.');
  }

  // ─── Pays ─────────────────────────────────────────────────
  getFlagUrl(code: string): string {
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  }

  selectCountry(code: string) {
    this.newBank.paysCode = code;
    const country = this.countries.find(c => c.code === code);
    if (country) {
      this.newBank.paysNom = country.nom;
      this.newBank.flagUrl = this.getFlagUrl(code);
    }
    this.searchCountry = '';
  }

  // ─── Devises (checkboxes) ─────────────────────────────────
  toggleDevise(devise: string, checked: boolean) {
    if (checked) {
      if (!this.selectedDevises.includes(devise)) {
        this.selectedDevises.push(devise);
      }
    } else {
      this.selectedDevises = this.selectedDevises.filter(d => d !== devise);
    }
    this.newBank.devises = this.selectedDevises.join(', ');
  }

  isDeviseSelected(devise: string): boolean {
    return this.selectedDevises.includes(devise);
  }

  // ─── Validation ───────────────────────────────────────────
  private validateBank(): boolean {
    if (!this.newBank.participant || this.newBank.participant.trim() === '') {
      this.formError = 'Le code participant est obligatoire.';
      return false;
    }
    if (!this.newBank.nomBanque || this.newBank.nomBanque.trim() === '') {
      this.formError = 'Le nom de la banque est obligatoire.';
      return false;
    }

    // CORRECTION : validation BIC (8 ou 11 caractères)
    const bic = (this.newBank.bic || '').trim();
    if (bic.length !== 8 && bic.length !== 11) {
      this.formError = 'Le BIC doit contenir exactement 8 ou 11 caractères (ex: BNPAFRPP ou BNPAFRPPXXX).';
      return false;
    }

    if (!this.newBank.paysCode) {
      this.formError = 'Veuillez sélectionner un pays.';
      return false;
    }
    if (!this.newBank.devises || this.selectedDevises.length === 0) {
      this.formError = 'Veuillez sélectionner au moins une devise.';
      return false;
    }

    this.formError = '';
    return true;
  }

  // ─── Sauvegarde ───────────────────────────────────────────
  saveBank() {
    if (!this.validateBank()) return;

    if (this.isEditing && this.selectedBank) {
      // Modifier banque existante
      const index = this.banks.findIndex(b => b.id === this.selectedBank!.id);
      this.banks[index] = {
        ...this.selectedBank,
        ...this.newBank,
        bic: (this.newBank.bic || '').trim().toUpperCase(),
        participant: (this.newBank.participant || '').trim().toUpperCase(),
      } as Bank;
      this.showModal = false;
      this.showSuccess('Banque modifiée avec succès.');
    } else {
      // Ajouter nouvelle banque
      const newId = Math.max(...this.banks.map(b => b.id), 0) + 1;
      const bank: Bank = {
        id: newId,
        participant: (this.newBank.participant || '').trim().toUpperCase(),
        nomBanque:   this.newBank.nomBanque   || '',
        paysCode:    this.newBank.paysCode    || '',
        paysNom:     this.newBank.paysNom     || '',
        flagUrl:     this.newBank.flagUrl     || '',
        bic:         (this.newBank.bic || '').trim().toUpperCase(),
        devises:     this.newBank.devises     || '',
        statut:      this.newBank.statut      || 'ACTIF',
        cutOff:      this.newBank.cutOff      || '',
        reseau:      this.newBank.reseau      || ''
      };
      this.banks.push(bank);
      this.showModal = false;
      this.currentPage = 1;
      this.showSuccess('Banque ajoutée avec succès.');
    }
  }

  // ─── Pagination ────────────────────────────────────────────
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }
  previousPage() { this.goToPage(this.currentPage - 1); }
  nextPage()     { this.goToPage(this.currentPage + 1); }

  navigate(route: string) { this.router.navigate([route]); }

  // ─── Message succès temporaire ────────────────────────────
  private showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }
}

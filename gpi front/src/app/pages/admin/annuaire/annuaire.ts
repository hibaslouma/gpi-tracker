import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BanqueService, Bank } from '../../../services/banque.service';

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
  'SWIFT Network', 'T2S (Target2-Securities)', 'CHIPS (Clearing House)',
  'RTGS (Real-Time Gross Settlement)', 'ACH (Automated Clearing House)',
  'Fedwire', 'CIPS (Cross-border Interbank Payment System)', 'BOJ-NET (Bank of Japan)',
];

const DEVISES_LIST = [
  'TND', 'EUR', 'USD', 'GBP', 'JPY', 'CNY',
  'CAD', 'CHF', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'INR', 'BRL',
];

@Component({
  selector: 'app-annuaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire.html',
  styleUrl: './annuaire.scss'
})
export class Annuaire implements OnInit {

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
  formError = '';
  successMessage = '';
  isLoading = false;
  isSubmitting = false;
  isDeleting = false;
  selectedDevises: string[] = [];
  banks: Bank[] = [];
  newBank: Partial<Bank> = this.emptyBank();

  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(val: string) { this._searchQuery = val; this.currentPage = 1; this.cdr.detectChanges(); }

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

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  private emptyBank(): Partial<Bank> {
    return {
      participant: '', nomBanque: '', paysCode: '', paysNom: '',
      flagUrl: '', bic: '', devises: '', statut: 'ACTIF', cutOff: '', reseau: ''
    };
  }

  constructor(
    private router: Router,
    private banqueService: BanqueService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.loadBanks(); }

  loadBanks() {
    this.isLoading = true;
    this.banks = [];
    this.cdr.detectChanges();
    this.banqueService.getAll().subscribe({
      next: (data) => {
        this.banks = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement banques', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.selectedBank = null;
    this.newBank = this.emptyBank();
    this.selectedDevises = [];
    this.searchCountry = '';
    this.formError = '';
    this.isSubmitting = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(bank: Bank) {
    this.isEditing = true;
    this.selectedBank = bank;
    this.newBank = { ...bank };
    this.selectedDevises = bank.devises.split(', ').map(d => d.trim()).filter(d => d);
    this.searchCountry = '';
    this.formError = '';
    this.isSubmitting = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showModal = false;
    this.formError = '';
    this.isSubmitting = false;
    this.cdr.detectChanges();
  }

  confirmDelete(bank: Bank) {
    this.selectedBank = bank;
    this.isDeleting = false;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  saveBank() {
    if (!this.validateBank()) return;
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();

    const bankData: Bank = {
      ...this.newBank as Bank,
      bic: (this.newBank.bic || '').trim().toUpperCase(),
      participant: (this.newBank.participant || '').trim().toUpperCase(),
    };

    if (this.isEditing && this.selectedBank) {
      this.banqueService.update(this.selectedBank.id!, bankData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.cdr.detectChanges();
          this.loadBanks();
          this.showSuccess('Banque modifiée !');
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || err?.message || '';
          this.formError = msg.toLowerCase().includes('bic')
            ? 'Ce BIC existe déjà. Veuillez en saisir un autre.'
            : 'Erreur lors de la modification.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.banqueService.create(bankData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.cdr.detectChanges();
          this.loadBanks();
          this.showSuccess('Banque ajoutée !');
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || err?.message || '';
          this.formError = msg.toLowerCase().includes('bic')
            ? 'Ce BIC existe déjà. Veuillez en saisir un autre.'
            : 'Erreur lors de la création.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteBank() {
    if (!this.selectedBank || !this.selectedBank.id) return;
    if (this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();

    this.banqueService.delete(this.selectedBank.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.selectedBank = null;
        this.cdr.detectChanges();
        this.loadBanks();
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        this.showSuccess('Banque supprimée !');
      },
      error: (err) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.selectedBank = null;
        this.cdr.detectChanges();
        this.loadBanks();
        console.error('Erreur suppression:', err);
      }
    });
  }

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
    this.cdr.detectChanges();
  }

  toggleDevise(devise: string, checked: boolean) {
    if (checked) {
      if (!this.selectedDevises.includes(devise)) this.selectedDevises.push(devise);
    } else {
      this.selectedDevises = this.selectedDevises.filter(d => d !== devise);
    }
    this.newBank.devises = this.selectedDevises.join(', ');
    this.cdr.detectChanges();
  }

  isDeviseSelected(devise: string): boolean {
    return this.selectedDevises.includes(devise);
  }

  private validateBank(): boolean {
    if (!this.newBank.participant?.trim()) {
      this.formError = 'Le code participant est obligatoire.';
      this.cdr.detectChanges(); return false;
    }
    if (!this.newBank.nomBanque?.trim()) {
      this.formError = 'Le nom de la banque est obligatoire.';
      this.cdr.detectChanges(); return false;
    }
    const bic = (this.newBank.bic || '').trim();
    if (bic.length !== 8 && bic.length !== 11) {
      this.formError = 'Le BIC doit contenir 8 ou 11 caractères.';
      this.cdr.detectChanges(); return false;
    }
    if (!this.newBank.paysCode) {
      this.formError = 'Veuillez sélectionner un pays.';
      this.cdr.detectChanges(); return false;
    }
    if (!this.newBank.devises || this.selectedDevises.length === 0) {
      this.formError = 'Veuillez sélectionner au moins une devise.';
      this.cdr.detectChanges(); return false;
    }
    this.formError = '';
    return true;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }
  previousPage() { this.goToPage(this.currentPage - 1); }
  nextPage() { this.goToPage(this.currentPage + 1); }
  navigate(route: string) { this.router.navigate([route]); }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }
}
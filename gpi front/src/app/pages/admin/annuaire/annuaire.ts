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
  'TND',
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CNY',
  'CAD',
  'CHF',
  'AUD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'INR',
  'BRL',
];

@Component({
  selector: 'app-annuaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire.html',
  styleUrl: './annuaire.scss'
})
export class Annuaire implements OnInit {

  searchQuery = '';
  searchCountry = '';
  currentPage = 1;
  itemsPerPage = 10;
  showModal = false;
  countries = COUNTRIES;
  reseaux = RESEAUX;
  devises = DEVISES_LIST;

  newBank: Partial<Bank> = {
    participant: '',
    nomBanque: '',
    paysCode: '',
    paysNom: '',
    bic: '',
    devises: '',
    statut: 'ACTIF',
    cutOff: '',
    reseau: ''
  };

  banks: Bank[] = [
    { id: 1, participant: 'BNRSIBRXXX', nomBanque: 'Belfius Bank', paysCode: 'BE', paysNom: 'BELGIQUE', flagUrl: 'https://flagcdn.com/w80/be.png', bic: 'BNRSIBRXXX', devises: 'EUR, USD', statut: 'ACTIF', cutOff: '16:00+0100', reseau: 'SWIFT Network' }
    
  ];

  get filteredCountries(): any[] {
    if (!this.searchCountry) {
      return this.countries;
    }
    return this.countries.filter(c =>
      c.code.toLowerCase().includes(this.searchCountry.toLowerCase()) ||
      c.nom.toLowerCase().includes(this.searchCountry.toLowerCase())
    );
  }

  get filteredBanks(): Bank[] {
    return this.banks.filter(b =>
      b.participant.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      b.nomBanque.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      b.paysNom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      b.devises.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  get paginatedBanks(): Bank[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredBanks.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredBanks.length / this.itemsPerPage);
  }

  constructor(private router: Router) {}

  ngOnInit() {
    // Initialisation
  }

  openAddModal() {
    this.showModal = true;
    this.newBank = {
      participant: '',
      nomBanque: '',
      paysCode: '',
      paysNom: '',
      bic: '',
      devises: '',
      statut: 'ACTIF',
      cutOff: '',
      reseau: ''
    };
    this.searchCountry = '';
  }

  closeModal() {
    this.showModal = false;
  }

  getFlagUrl(code: string): string {
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  }

  onCountryChange() {
    if (this.newBank.paysCode) {
      const country = this.countries.find(c => c.code === this.newBank.paysCode);
      if (country) {
        this.newBank.paysNom = country.nom;
        this.newBank.flagUrl = this.getFlagUrl(this.newBank.paysCode);
      }
    }
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

  saveBank() {
    if (!this.newBank.participant || !this.newBank.nomBanque || !this.newBank.bic || 
        !this.newBank.paysCode || !this.newBank.devises) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newId = this.banks.length + 1;
    const bank: Bank = {
      id: newId,
      participant: this.newBank.participant || '',
      nomBanque: this.newBank.nomBanque || '',
      paysCode: this.newBank.paysCode || '',
      paysNom: this.newBank.paysNom || '',
      flagUrl: this.newBank.flagUrl || '',
      bic: this.newBank.bic || '',
      devises: this.newBank.devises || '',
      statut: this.newBank.statut || 'ACTIF',
      cutOff: this.newBank.cutOff || '',
      reseau: this.newBank.reseau || ''
    };

    this.banks.push(bank);
    this.showModal = false;
    this.currentPage = 1;
  }

  previousPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }
}
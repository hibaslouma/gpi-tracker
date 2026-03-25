import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BanqueService, Bank } from '../../../services/banque.service';

const COUNTRIES = [
  { code: 'AF', nom: 'AFGHANISTAN' },
  { code: 'ZA', nom: 'AFRIQUE DU SUD' },
  { code: 'AL', nom: 'ALBANIE' },
  { code: 'DZ', nom: 'ALGÉRIE' },
  { code: 'DE', nom: 'ALLEMAGNE' },
  { code: 'AD', nom: 'ANDORRE' },
  { code: 'AO', nom: 'ANGOLA' },
  { code: 'SA', nom: 'ARABIE SAOUDITE' },
  { code: 'AR', nom: 'ARGENTINE' },
  { code: 'AM', nom: 'ARMÉNIE' },
  { code: 'AU', nom: 'AUSTRALIE' },
  { code: 'AT', nom: 'AUTRICHE' },
  { code: 'AZ', nom: 'AZERBAÏDJAN' },
  { code: 'BS', nom: 'BAHAMAS' },
  { code: 'BH', nom: 'BAHREÏN' },
  { code: 'BD', nom: 'BANGLADESH' },
  { code: 'BE', nom: 'BELGIQUE' },
  { code: 'BZ', nom: 'BELIZE' },
  { code: 'BJ', nom: 'BÉNIN' },
  { code: 'BT', nom: 'BHOUTAN' },
  { code: 'BY', nom: 'BIÉLORUSSIE' },
  { code: 'BO', nom: 'BOLIVIE' },
  { code: 'BA', nom: 'BOSNIE-HERZÉGOVINE' },
  { code: 'BW', nom: 'BOTSWANA' },
  { code: 'BR', nom: 'BRÉSIL' },
  { code: 'BN', nom: 'BRUNEI' },
  { code: 'BG', nom: 'BULGARIE' },
  { code: 'BF', nom: 'BURKINA FASO' },
  { code: 'BI', nom: 'BURUNDI' },
  { code: 'CV', nom: 'CAP-VERT' },
  { code: 'KH', nom: 'CAMBODGE' },
  { code: 'CM', nom: 'CAMEROUN' },
  { code: 'CA', nom: 'CANADA' },
  { code: 'CF', nom: 'CENTRAFRIQUE' },
  { code: 'CL', nom: 'CHILI' },
  { code: 'CN', nom: 'CHINE' },
  { code: 'CY', nom: 'CHYPRE' },
  { code: 'CO', nom: 'COLOMBIE' },
  { code: 'KM', nom: 'COMORES' },
  { code: 'CG', nom: 'CONGO' },
  { code: 'CD', nom: 'CONGO (RDC)' },
  { code: 'KP', nom: 'CORÉE DU NORD' },
  { code: 'KR', nom: 'CORÉE DU SUD' },
  { code: 'CR', nom: 'COSTA RICA' },
  { code: 'CI', nom: 'CÔTE D\'IVOIRE' },
  { code: 'HR', nom: 'CROATIE' },
  { code: 'CU', nom: 'CUBA' },
  { code: 'DK', nom: 'DANEMARK' },
  { code: 'DJ', nom: 'DJIBOUTI' },
  { code: 'EG', nom: 'ÉGYPTE' },
  { code: 'AE', nom: 'ÉMIRATS ARABES UNIS' },
  { code: 'EC', nom: 'ÉQUATEUR' },
  { code: 'ER', nom: 'ÉRYTHRÉE' },
  { code: 'ES', nom: 'ESPAGNE' },
  { code: 'EE', nom: 'ESTONIE' },
  { code: 'ET', nom: 'ÉTHIOPIE' },
  { code: 'FJ', nom: 'FIDJI' },
  { code: 'FI', nom: 'FINLANDE' },
  { code: 'FR', nom: 'FRANCE' },
  { code: 'GA', nom: 'GABON' },
  { code: 'GM', nom: 'GAMBIE' },
  { code: 'GE', nom: 'GÉORGIE' },
  { code: 'GH', nom: 'GHANA' },
  { code: 'GR', nom: 'GRÈCE' },
  { code: 'GT', nom: 'GUATEMALA' },
  { code: 'GN', nom: 'GUINÉE' },
  { code: 'GW', nom: 'GUINÉE-BISSAU' },
  { code: 'GQ', nom: 'GUINÉE ÉQUATORIALE' },
  { code: 'GY', nom: 'GUYANA' },
  { code: 'HT', nom: 'HAÏTI' },
  { code: 'HN', nom: 'HONDURAS' },
  { code: 'HU', nom: 'HONGRIE' },
  { code: 'IN', nom: 'INDE' },
  { code: 'ID', nom: 'INDONÉSIE' },
  { code: 'IQ', nom: 'IRAK' },
  { code: 'IR', nom: 'IRAN' },
  { code: 'IE', nom: 'IRLANDE' },
  { code: 'IS', nom: 'ISLANDE' },
  { code: 'IL', nom: 'ISRAËL' },
  { code: 'IT', nom: 'ITALIE' },
  { code: 'JM', nom: 'JAMAÏQUE' },
  { code: 'JP', nom: 'JAPON' },
  { code: 'JO', nom: 'JORDANIE' },
  { code: 'KZ', nom: 'KAZAKHSTAN' },
  { code: 'KE', nom: 'KENYA' },
  { code: 'KG', nom: 'KIRGHIZISTAN' },
  { code: 'KI', nom: 'KIRIBATI' },
  { code: 'KW', nom: 'KOWEÏT' },
  { code: 'LA', nom: 'LAOS' },
  { code: 'LS', nom: 'LESOTHO' },
  { code: 'LV', nom: 'LETTONIE' },
  { code: 'LB', nom: 'LIBAN' },
  { code: 'LR', nom: 'LIBÉRIA' },
  { code: 'LY', nom: 'LIBYE' },
  { code: 'LI', nom: 'LIECHTENSTEIN' },
  { code: 'LT', nom: 'LITUANIE' },
  { code: 'LU', nom: 'LUXEMBOURG' },
  { code: 'MK', nom: 'MACÉDOINE DU NORD' },
  { code: 'MG', nom: 'MADAGASCAR' },
  { code: 'MY', nom: 'MALAISIE' },
  { code: 'MW', nom: 'MALAWI' },
  { code: 'MV', nom: 'MALDIVES' },
  { code: 'ML', nom: 'MALI' },
  { code: 'MT', nom: 'MALTE' },
  { code: 'MA', nom: 'MAROC' },
  { code: 'MR', nom: 'MAURITANIE' },
  { code: 'MU', nom: 'MAURICE' },
  { code: 'MX', nom: 'MEXIQUE' },
  { code: 'MD', nom: 'MOLDAVIE' },
  { code: 'MC', nom: 'MONACO' },
  { code: 'MN', nom: 'MONGOLIE' },
  { code: 'ME', nom: 'MONTÉNÉGRO' },
  { code: 'MZ', nom: 'MOZAMBIQUE' },
  { code: 'NA', nom: 'NAMIBIE' },
  { code: 'NR', nom: 'NAURU' },
  { code: 'NP', nom: 'NÉPAL' },
  { code: 'NI', nom: 'NICARAGUA' },
  { code: 'NE', nom: 'NIGER' },
  { code: 'NG', nom: 'NIGERIA' },
  { code: 'NO', nom: 'NORVÈGE' },
  { code: 'NZ', nom: 'NOUVELLE-ZÉLANDE' },
  { code: 'OM', nom: 'OMAN' },
  { code: 'UG', nom: 'OUGANDA' },
  { code: 'UZ', nom: 'OUZBÉKISTAN' },
  { code: 'PK', nom: 'PAKISTAN' },
  { code: 'PW', nom: 'PALAOS' },
  { code: 'PA', nom: 'PANAMA' },
  { code: 'PG', nom: 'PAPOUASIE-NOUVELLE-GUINÉE' },
  { code: 'PY', nom: 'PARAGUAY' },
  { code: 'NL', nom: 'PAYS-BAS' },
  { code: 'PE', nom: 'PÉROU' },
  { code: 'PH', nom: 'PHILIPPINES' },
  { code: 'PL', nom: 'POLOGNE' },
  { code: 'PT', nom: 'PORTUGAL' },
  { code: 'QA', nom: 'QATAR' },
  { code: 'RO', nom: 'ROUMANIE' },
  { code: 'GB', nom: 'ROYAUME-UNI' },
  { code: 'RU', nom: 'RUSSIE' },
  { code: 'RW', nom: 'RWANDA' },
  { code: 'SV', nom: 'SALVADOR' },
  { code: 'WS', nom: 'SAMOA' },
  { code: 'ST', nom: 'SAO TOMÉ-ET-PRÍNCIPE' },
  { code: 'SN', nom: 'SÉNÉGAL' },
  { code: 'RS', nom: 'SERBIE' },
  { code: 'SC', nom: 'SEYCHELLES' },
  { code: 'SL', nom: 'SIERRA LEONE' },
  { code: 'SG', nom: 'SINGAPOUR' },
  { code: 'SK', nom: 'SLOVAQUIE' },
  { code: 'SI', nom: 'SLOVÉNIE' },
  { code: 'SO', nom: 'SOMALIE' },
  { code: 'SD', nom: 'SOUDAN' },
  { code: 'SS', nom: 'SOUDAN DU SUD' },
  { code: 'LK', nom: 'SRI LANKA' },
  { code: 'SE', nom: 'SUÈDE' },
  { code: 'CH', nom: 'SUISSE' },
  { code: 'SR', nom: 'SURINAME' },
  { code: 'SZ', nom: 'ESWATINI' },
  { code: 'SY', nom: 'SYRIE' },
  { code: 'TJ', nom: 'TADJIKISTAN' },
  { code: 'TZ', nom: 'TANZANIE' },
  { code: 'TD', nom: 'TCHAD' },
  { code: 'CZ', nom: 'TCHÉQUIE' },
  { code: 'TH', nom: 'THAÏLANDE' },
  { code: 'TL', nom: 'TIMOR ORIENTAL' },
  { code: 'TG', nom: 'TOGO' },
  { code: 'TO', nom: 'TONGA' },
  { code: 'TT', nom: 'TRINITÉ-ET-TOBAGO' },
  { code: 'TN', nom: 'TUNISIE' },
  { code: 'TM', nom: 'TURKMÉNISTAN' },
  { code: 'TR', nom: 'TURQUIE' },
  { code: 'TV', nom: 'TUVALU' },
  { code: 'UA', nom: 'UKRAINE' },
  { code: 'UY', nom: 'URUGUAY' },
  { code: 'VU', nom: 'VANUATU' },
  { code: 'VE', nom: 'VENEZUELA' },
  { code: 'VN', nom: 'VIÊT NAM' },
  { code: 'YE', nom: 'YÉMEN' },
  { code: 'ZM', nom: 'ZAMBIE' },
  { code: 'ZW', nom: 'ZIMBABWE' },
  { code: 'US', nom: 'ÉTATS-UNIS' },
];

const TYPES_BANQUE = [
  'Banque Centrale',
  'Banque Commerciale',
  'Banque Correspondante',
  'Banque d\'Investissement',
  'Banque de Développement',
];
const PAYS_DEVISE: { [key: string]: string } = {
  'TN': 'TND', 'FR': 'EUR', 'DE': 'EUR', 'ES': 'EUR', 'IT': 'EUR',
  'BE': 'EUR', 'NL': 'EUR', 'PT': 'EUR', 'AT': 'EUR', 'FI': 'EUR',
  'GR': 'EUR', 'IE': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'CY': 'EUR',
  'SK': 'EUR', 'SI': 'EUR', 'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR',
  'US': 'USD', 'EC': 'USD', 'PA': 'USD', 'SV': 'USD',
  'GB': 'GBP',
  'JP': 'JPY',
  'CN': 'CNY',
  'CA': 'CAD',
  'CH': 'CHF', 'LI': 'CHF',
  'AU': 'AUD',
  'NZ': 'NZD',
  'SE': 'SEK',
  'NO': 'NOK',
  'DK': 'DKK',
  'IN': 'INR',
  'BR': 'BRL',
  'SA': 'SAR',
  'AE': 'AED',
  'MA': 'MAD',
  'DZ': 'DZD',
  'EG': 'EGP',
  'SN': 'XOF', 'CI': 'XOF', 'ML': 'XOF', 'BJ': 'XOF',
  'BF': 'XOF', 'NE': 'XOF', 'TG': 'XOF', 'GW': 'XOF',
  'CM': 'XAF', 'CF': 'XAF', 'CG': 'XAF', 'GA': 'XAF',
  'TD': 'XAF', 'GQ': 'XAF',
  'NG': 'NGN',
  'ZA': 'ZAR',
  'KE': 'KES',
  'GH': 'GHS',
  'MX': 'MXN',
  'AR': 'ARS',
  'TR': 'TRY',
  'RU': 'RUB',
  'KR': 'KRW',
  'SG': 'SGD',
  'HK': 'HKD',
  'MY': 'MYR',
  'TH': 'THB',
  'ID': 'IDR',
  'PH': 'PHP',
  'PK': 'PKR',
  'BD': 'BDT',
  'VN': 'VND',
  'QA': 'QAR',
  'KW': 'KWD',
  'BH': 'BHD',
  'OM': 'OMR',
  'JO': 'JOD',
  'LB': 'LBP',
  'IL': 'ILS',
  'PL': 'PLN',
  'CZ': 'CZK',
  'HU': 'HUF',
  'RO': 'RON',
  'HR': 'EUR',
  'RS': 'RSD',
  'UA': 'UAH',
};
const DEVISES_LIST = [
  'TND', 'EUR', 'USD', 'GBP', 'JPY', 'CNY',
  'CAD', 'CHF', 'AUD', 'NZD', 'SEK', 'NOK',
  'DKK', 'INR', 'BRL', 'SAR', 'AED', 'MAD',
  'DZD', 'EGP', 'XOF', 'XAF', 'NGN', 'ZAR',
  'KES', 'GHS', 'MXN', 'ARS', 'TRY', 'RUB',
  'KRW', 'SGD', 'HKD', 'MYR', 'THB', 'IDR',
  'PHP', 'PKR', 'BDT', 'VND', 'QAR', 'KWD',
  'BHD', 'OMR', 'JOD', 'LBP', 'ILS', 'PLN',
  'CZK', 'HUF', 'RON', 'RSD', 'UAH'
];
const PAYS_FUSEAU: { [key: string]: string } = {
  'TN': 'UTC+01:00 (Paris/Tunis)',
  'FR': 'UTC+01:00 (Paris/Tunis)',
  'DE': 'UTC+01:00 (Paris/Tunis)',
  'ES': 'UTC+01:00 (Paris/Tunis)',
  'IT': 'UTC+01:00 (Paris/Tunis)',
  'BE': 'UTC+01:00 (Paris/Tunis)',
  'NL': 'UTC+01:00 (Paris/Tunis)',
  'PT': 'UTC+00:00 (Londres)',
  'GB': 'UTC+00:00 (Londres)',
  'IE': 'UTC+00:00 (Londres)',
  'MA': 'UTC+01:00 (Paris/Tunis)',
  'DZ': 'UTC+01:00 (Paris/Tunis)',
  'EG': 'UTC+02:00 (Le Caire)',
  'SA': 'UTC+03:00 (Riyad)',
  'AE': 'UTC+04:00 (Dubaï)',
  'QA': 'UTC+03:00 (Riyad)',
  'KW': 'UTC+03:00 (Riyad)',
  'BH': 'UTC+03:00 (Riyad)',
  'OM': 'UTC+04:00 (Dubaï)',
  'JO': 'UTC+02:00 (Le Caire)',
  'LB': 'UTC+02:00 (Le Caire)',
  'IQ': 'UTC+03:00 (Riyad)',
  'IL': 'UTC+02:00 (Le Caire)',
  'TR': 'UTC+03:00 (Riyad)',
  'RU': 'UTC+03:00 (Riyad)',
  'IN': 'UTC+05:30 (New Delhi)',
  'PK': 'UTC+05:00',
  'BD': 'UTC+06:00',
  'CN': 'UTC+08:00 (Pékin)',
  'JP': 'UTC+09:00 (Tokyo)',
  'KR': 'UTC+09:00 (Tokyo)',
  'SG': 'UTC+08:00 (Pékin)',
  'MY': 'UTC+08:00 (Pékin)',
  'TH': 'UTC+07:00 (Bangkok)',
  'VN': 'UTC+07:00 (Bangkok)',
  'ID': 'UTC+07:00 (Bangkok)',
  'PH': 'UTC+08:00 (Pékin)',
  'AU': 'UTC+10:00 (Sydney)',
  'NZ': 'UTC+12:00',
  'US': 'UTC-05:00',
  'CA': 'UTC-05:00',
  'MX': 'UTC-06:00',
  'BR': 'UTC-03:00',
  'AR': 'UTC-03:00',
  'NG': 'UTC+01:00 (Paris/Tunis)',
  'GH': 'UTC+00:00 (Londres)',
  'SN': 'UTC+00:00 (Londres)',
  'CI': 'UTC+00:00 (Londres)',
  'ZA': 'UTC+02:00 (Le Caire)',
  'KE': 'UTC+03:00 (Riyad)',
  'PL': 'UTC+01:00 (Paris/Tunis)',
  'CZ': 'UTC+01:00 (Paris/Tunis)',
  'HU': 'UTC+01:00 (Paris/Tunis)',
  'RO': 'UTC+02:00 (Le Caire)',
  'UA': 'UTC+02:00 (Le Caire)',
  'CH': 'UTC+01:00 (Paris/Tunis)',
  'LU': 'UTC+01:00 (Paris/Tunis)',
  'AT': 'UTC+01:00 (Paris/Tunis)',
  'FI': 'UTC+02:00 (Le Caire)',
  'GR': 'UTC+02:00 (Le Caire)',
  'SE': 'UTC+01:00 (Paris/Tunis)',
  'NO': 'UTC+01:00 (Paris/Tunis)',
  'DK': 'UTC+01:00 (Paris/Tunis)',
};
const FUSEAUX = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00',
  'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00',
  'UTC-04:00', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00',
  'UTC+00:00 (Londres)', 'UTC+01:00 (Paris/Tunis)',
  'UTC+02:00 (Le Caire)', 'UTC+03:00 (Riyad)',
  'UTC+04:00 (Dubaï)', 'UTC+05:00', 'UTC+05:30 (New Delhi)',
  'UTC+06:00', 'UTC+07:00 (Bangkok)', 'UTC+08:00 (Pékin)',
  'UTC+09:00 (Tokyo)', 'UTC+10:00 (Sydney)',
  'UTC+11:00', 'UTC+12:00',
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
  typesBanque = TYPES_BANQUE;
  devises = DEVISES_LIST;
  fuseaux = FUSEAUX;
  formError = '';
  successMessage = '';
  isLoading = false;
  isSubmitting = false;
  isDeleting = false;
  selectedDevises: string[] = [];
  banks: Bank[] = [];
  today = new Date().toISOString().split('T')[0];
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
      (b.bic || '').toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      (b.nomBanque || '').toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      (b.paysNom || '').toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      (b.devise || '').toLowerCase().includes(this._searchQuery.toLowerCase()) ||
      (b.typeBanque || '').toLowerCase().includes(this._searchQuery.toLowerCase())
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
      bic: '', nomBanque: '', paysCode: '', paysNom: '',
      flagUrl: '', typeBanque: '', devise: '',
      cutOff: '', fuseauHoraire: ''
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
    this.selectedDevises = bank.devise.split(', ').map(d => d.trim()).filter(d => d);
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
          const msg = err?.error?.message || '';
          this.formError = msg.toLowerCase().includes('bic')
            ? 'Ce BIC existe déjà.' : 'Erreur lors de la modification.';
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
          const msg = err?.error?.message || '';
          this.formError = msg.toLowerCase().includes('bic')
            ? 'Ce BIC existe déjà.' : 'Erreur lors de la création.';
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

  // Devise automatique
  const devise = PAYS_DEVISE[code];
  if (devise) {
    this.selectedDevises = [devise];
    this.newBank.devise = devise;
  } else {
    this.selectedDevises = [];
    this.newBank.devise = '';
  }

  // Fuseau automatique
  const fuseau = PAYS_FUSEAU[code];
  if (fuseau) {
    this.newBank.fuseauHoraire = fuseau;
  } else {
    this.newBank.fuseauHoraire = '';
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
    this.newBank.devise = this.selectedDevises.join(', ');
    this.cdr.detectChanges();
  }

  isDeviseSelected(devise: string): boolean {
    return this.selectedDevises.includes(devise);
  }

  private validateBank(): boolean {

    // BIC
    const bic = (this.newBank.bic || '').trim().toUpperCase();
    if (!bic) {
      this.formError = 'Le BIC est obligatoire.';
      this.cdr.detectChanges(); return false;
    }
    if (bic.length !== 8 && bic.length !== 11) {
      this.formError = 'Le BIC doit contenir exactement 8 ou 11 caractères.';
      this.cdr.detectChanges(); return false;
    }
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
      this.formError = 'Format BIC invalide. Ex: BIATTNTT ou BIATTNTTXXX';
      this.cdr.detectChanges(); return false;
    }

    // Nom banque
    if (!this.newBank.nomBanque?.trim()) {
      this.formError = 'Le nom de la banque est obligatoire.';
      this.cdr.detectChanges(); return false;
    }
    if (this.newBank.nomBanque.trim().length < 2) {
      this.formError = 'Le nom doit contenir au moins 2 caractères.';
      this.cdr.detectChanges(); return false;
    }
    if (this.newBank.nomBanque.trim().length > 100) {
      this.formError = 'Le nom ne peut pas dépasser 100 caractères.';
      this.cdr.detectChanges(); return false;
    }

    // Pays
    if (!this.newBank.paysCode) {
      this.formError = 'Veuillez sélectionner un pays.';
      this.cdr.detectChanges(); return false;
    }

    // Type
    if (!this.newBank.typeBanque) {
      this.formError = 'Veuillez sélectionner le type de banque.';
      this.cdr.detectChanges(); return false;
    }

    // Devise
    if (!this.newBank.devise || this.selectedDevises.length === 0) {
      this.formError = 'Veuillez sélectionner au moins une devise.';
      this.cdr.detectChanges(); return false;
    }

    // Cut-Off
    if (!this.newBank.cutOff) {
      this.formError = 'L\'heure de Cut-Off est obligatoire.';
      this.cdr.detectChanges(); return false;
    }

    // Fuseau horaire
    if (!this.newBank.fuseauHoraire) {
      this.formError = 'Le fuseau horaire est obligatoire.';
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
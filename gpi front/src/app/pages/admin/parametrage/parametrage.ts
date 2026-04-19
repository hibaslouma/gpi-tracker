import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-parametrage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametrage.html',
  styleUrl: './parametrage.scss'
})
export class Parametrage implements OnInit {

  private apiUrl = 'http://localhost:8080/api/parametrage';

  activeSection = 'banque';
  successMessage = '';
  hasChanges = false;

  sections = [
    { id: 'banque',  label: 'Informations de la banque', icon: 'pi-building' },
    { id: 'sla',     label: 'Paramètres SLA',            icon: 'pi-clock'    },
    { id: 'devises', label: 'Devises',                   icon: 'pi-dollar'   },
    { id: 'xml',     label: 'Gestion fichiers XML',      icon: 'pi-file'     },
  ];

  banque = {
    nom:       '',
    bic:       '',
    pays:      'TN',
    fuseau:    'Africa/Tunis',
    adresse:   '',
    telephone: '',
    email:     '',
    site:      '',
  };

  fuseaux = [
    'Africa/Tunis', 'Europe/Paris', 'Europe/London',
    'America/New_York', 'Asia/Tokyo', 'Asia/Dubai', 'UTC'
  ];

  pays = [
    { code: 'TN', nom: 'Tunisie'     },
    { code: 'FR', nom: 'France'      },
    { code: 'BE', nom: 'Belgique'    },
    { code: 'DE', nom: 'Allemagne'   },
    { code: 'GB', nom: 'Royaume-Uni' },
    { code: 'US', nom: 'États-Unis'  },
  ];

  sla = {
    delaiConfirmation: 30,
    delaiAlerte:       20,
    delaiRecall:       60,
  };

  devisesActives = ['TND', 'EUR', 'USD', 'GBP'];
  toutesDevises  = ['TND','EUR','USD','GBP','JPY','CNY','CAD','CHF'];
  deviseDefaut   = 'TND';

  xml = {
    dossierRecu: '',
    dossierEmis: '',
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (data) => {
        if (data) {
          this.banque.nom       = data.nomBanque       || '';
          this.banque.bic       = data.bic             || '';
          this.banque.pays      = data.pays            || 'TN';
          this.banque.fuseau    = data.fuseau          || 'Africa/Tunis';
          this.banque.adresse   = data.adresse         || '';
          this.banque.telephone = data.telephone       || '';
          this.banque.email     = data.email           || '';
          this.banque.site      = data.siteWeb         || '';
          this.sla.delaiConfirmation = data.delaiConfirmation || 30;
          this.sla.delaiAlerte       = data.delaiAlerte       || 20;
          this.sla.delaiRecall       = data.delaiRecall       || 60;
          this.devisesActives = data.devisesActives?.split(',') || ['TND'];
          this.deviseDefaut   = data.deviseDefaut || 'TND';
          this.xml.dossierRecu = data.dossierRecu || '';
          this.xml.dossierEmis = data.dossierEmis || '';
        }
      },
      error: (err) => console.error('Erreur chargement paramétrage', err)
    });
  }

  toggleDevise(devise: string) {
    const idx = this.devisesActives.indexOf(devise);
    if (idx >= 0) {
      if (this.devisesActives.length > 1) {
        this.devisesActives.splice(idx, 1);
        this.markChanged();
      }
    } else {
      this.devisesActives.push(devise);
      this.markChanged();
    }
  }

  isDeviseActive(d: string): boolean {
    return this.devisesActives.includes(d);
  }

  setSection(id: string) { this.activeSection = id; }
  markChanged() { this.hasChanges = true; }
  annuler() { this.hasChanges = false; }

  sauvegarder() {
    const payload = {
      nomBanque:         this.banque.nom,
      bic:               this.banque.bic,
      pays:              this.banque.pays,
      fuseau:            this.banque.fuseau,
      adresse:           this.banque.adresse,
      telephone:         this.banque.telephone,
      email:             this.banque.email,
      siteWeb:           this.banque.site,
      delaiConfirmation: this.sla.delaiConfirmation,
      delaiAlerte:       this.sla.delaiAlerte,
      delaiRecall:       this.sla.delaiRecall,
      devisesActives:    this.devisesActives.join(','),
      deviseDefaut:      this.deviseDefaut,
    };

    this.http.patch<any>(this.apiUrl, payload).subscribe({
      next: () => {
        this.hasChanges = false;
        this.successMessage = 'Paramètres enregistrés avec succès.';
        setTimeout(() => this.successMessage = '', 3500);
      },
      error: (err) => {
        console.error('Erreur sauvegarde', err);
        this.successMessage = 'Erreur lors de la sauvegarde.';
      }
    });
  }

  formatMinutes(min: number): string {
    if (min < 60)   return `${min} min`;
    if (min < 1440) return `${min / 60}h`;
    return `${min / 1440}j`;
  }
}
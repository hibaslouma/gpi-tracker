import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-parametrage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametrage.html',
  styleUrl: './parametrage.scss'
})
export class Parametrage {

  activeSection = 'banque';
  successMessage = '';
  hasChanges = false;

  sections = [
    { id: 'banque',        label: 'Informations de la banque', icon: 'pi-building' },
    { id: 'sla',           label: 'Paramètres SLA',            icon: 'pi-clock' },
    { id: 'notifications', label: 'Notifications & alertes',   icon: 'pi-bell' },
    { id: 'devises',       label: 'Devises et limites',        icon: 'pi-dollar' },
    { id: 'xml',           label: 'Gestion fichiers XML',      icon: 'pi-file' },
    { id: 'securite',      label: 'Sécurité & sessions',       icon: 'pi-shield' },
  ];

  banque = {
    nom:       'Banque Nationale de Tunisie',
    bic:       'BNTNTNTXXXX',
    pays:      'TN',
    fuseau:    'Africa/Tunis',
    adresse:   'Rue Hédi Nouira, Tunis 1001',
    telephone: '+216 71 340 000',
    email:     'gpi@bnt.com.tn',
    site:      'https://www.bnt.com.tn',
  };

  fuseaux = [
    'Africa/Tunis', 'Europe/Paris', 'Europe/London',
    'America/New_York', 'Asia/Tokyo', 'Asia/Dubai', 'UTC'
  ];

  pays = [
    { code: 'TN', nom: 'Tunisie' }, { code: 'FR', nom: 'France' },
    { code: 'BE', nom: 'Belgique' }, { code: 'DE', nom: 'Allemagne' },
    { code: 'GB', nom: 'Royaume-Uni' }, { code: 'US', nom: 'États-Unis' },
  ];

  sla = {
    delaiConfirmation:  30,
    delaiAlerte:        20,
    delaiRecall:        60,
    delaiCreditMax:     1440,
    alerteDepassement:  true,
    alerteRetard:       true,
  };

  notifications = {
    emailPaiementRejet:   true,
    emailDepassementSLA:  true,
    emailRecallEnAttente: true,
    emailNouveauPaiement: false,
    emailAdresse:         'admin@bnt.com.tn',
    emailCopie:           '',
    frequenceRapport:     'quotidien',
  };

  frequences = ['temps-reel', 'toutes-les-heures', 'quotidien', 'hebdomadaire'];
  frequencesLabels: { [key: string]: string } = {
    'temps-reel':        'Temps réel',
    'toutes-les-heures': 'Toutes les heures',
    'quotidien':         'Quotidien',
    'hebdomadaire':      'Hebdomadaire',
  };

  devisesActives = ['TND', 'EUR', 'USD', 'GBP'];
  toutesDevises  = ['TND','EUR','USD','GBP','JPY','CNY','CAD','CHF','AUD','NZD','SEK','NOK','DKK','INR','BRL'];

  limites = {
    montantMin:   100,
    montantMax:   10000000,
    seuilAlerte:  500000,
    deviseDefaut: 'TND',
  };

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

  xml = {
    dossierEntrant:   '/opt/gpi/incoming',
    dossierArchive:   '/opt/gpi/archive',
    dossierErreur:    '/opt/gpi/error',
    frequenceLecture: 30,
    traitementAuto:   true,
    archivageAuto:    true,
    retentionJours:   90,
    formatDate:       'dd/MM/yyyy HH:mm:ss',
  };

  statutXml = {
    actif:           true,
    derniereExec:    '14/03/2026 09:45:12',
    fichiersTraites: 1247,
    fichiersErreur:  3,
  };

  // Keycloak gère : mdp, 2FA, politique de session
  securite = {
    dureeSession:       30,
    tentativesMax:      5,
    blocageDuree:       15,
    journalisation:     true,
    retentionLogsJours: 365,
  };

  setSection(id: string) { this.activeSection = id; }

  markChanged() { this.hasChanges = true; }

  sauvegarder() {
    this.hasChanges = false;
    this.successMessage = 'Paramètres enregistrés avec succès.';
    setTimeout(() => this.successMessage = '', 3500);
  }

  annuler() { this.hasChanges = false; }

  formatMinutes(min: number): string {
    if (min < 60)   return `${min} min`;
    if (min < 1440) return `${min / 60}h`;
    return `${min / 1440}j`;
  }
}
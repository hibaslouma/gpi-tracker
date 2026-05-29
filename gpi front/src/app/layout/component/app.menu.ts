import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `<ul class="layout-menu">
    @for (item of model; track item.label) {
      @if (!item.separator) {
        <li app-menuitem [item]="item" [root]="true"></li>
      } @else {
        <li class="menu-separator"></li>
      }
    }
  </ul>`,
})
export class AppMenu implements OnInit, OnChanges {
  model: MenuItem[] = [];

  @Input() role: string = '';

  ngOnInit() {
    const effectiveRole = this.role || sessionStorage.getItem('role') || '';
    this.buildMenu(effectiveRole);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['role']?.currentValue) {
      this.buildMenu(changes['role'].currentValue);
    }
  }

  private buildMenu(role: string) {
    switch (role) {
      case 'Admin':
        this.model = [
          {
            label: 'Administration',
            items: [
              { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/admin'] },
              { label: 'Gestion des utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/admin/utilisateurs'] },
              { label: 'Paramétrage', icon: 'pi pi-fw pi-cog', routerLink: ['/admin/parametrage'] },
              { label: "Mise à jour de l'annuaire", icon: 'pi pi-fw pi-book', routerLink: ['/admin/annuaire'] }
            ]
          }
        ];
        break;

      case 'Backoffice':
        this.model = [
          {
            label: 'Vue Générale',
            items: [
              { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/backoffice'], queryParams: { tab: 'dashboard' } }
            ]
          },
          {
            label: 'Paiements Reçus',
            items: [
              { label: 'Paiements Reçus', icon: 'pi pi-fw pi-download', routerLink: ['/backoffice'], queryParams: { tab: 'entrants' } }
            ]
          },
          {
            label: 'Paiements Émis',
            items: [
              { label: 'Paiements Émis', icon: 'pi pi-fw pi-send', routerLink: ['/backoffice'], queryParams: { tab: 'vue-transactionnelle' } }
            ]
          },
          {
            label: 'Annulations',
            items: [
              { label: 'Demande Annulation', icon: 'pi pi-fw pi-times-circle', routerLink: ['/backoffice'], queryParams: { tab: 'annulation' } },
              { label: 'Réponse Annulation', icon: 'pi pi-fw pi-file', routerLink: ['/backoffice'], queryParams: { tab: 'annulations' } }
            ]
          },
          {
            label: 'Historique',
            items: [
              { label: 'Historique pacs', icon: 'pi pi-fw pi-history', routerLink: ['/backoffice'], queryParams: { tab: 'historique-pacs' } }
            ]
          }
        ];
        break;

      case 'Client':
        this.model = [
          {
            label: 'Client',
            items: [
              { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/client'], queryParams: { tab: 'dashboard' } },
              { label: 'Mes Paiements', icon: 'pi pi-fw pi-send', routerLink: ['/client'], queryParams: { tab: 'vue-transactionnelle' } },
            ]
          }
        ];
        break;

      default:
        this.model = [];
        break;
    }
  }
}
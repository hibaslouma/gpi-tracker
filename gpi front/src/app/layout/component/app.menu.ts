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
        // ✅ sessionStorage au lieu de localStorage — isolé par onglet
        const effectiveRole = this.role || sessionStorage.getItem('role') || '';
        this.buildMenu(effectiveRole);
    }

    ngOnChanges(changes: SimpleChanges) {
        // ✅ Se déclenche uniquement si le rôle a une vraie valeur
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
                        label: 'Vue générale',
                        items: [
                            { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/backoffice'], queryParams: { tab: 'dashboard' } }
                        ]
                    },
                    {
                        label: 'Paiements',
                        items: [
                            { label: 'Paiements Sortants', icon: 'pi pi-fw pi-send', routerLink: ['/backoffice'], queryParams: { tab: 'vue-transactionnelle' } },
                            { label: 'Paiements Entrants', icon: 'pi pi-fw pi-download', routerLink: ['/backoffice'], queryParams: { tab: 'entrants' } },
                            { label: 'Générer pacs.002', icon: 'pi pi-fw pi-check-circle', routerLink: ['/backoffice'], queryParams: { tab: 'confirmation' } }
                        ]
                    },
                    {
                        label: 'Annulations',
                        items: [
                            { label: 'Envoyer camt.056', icon: 'pi pi-fw pi-times-circle', routerLink: ['/backoffice'], queryParams: { tab: 'annulation' } },
                            { label: 'Suivi camt.029', icon: 'pi pi-fw pi-file', routerLink: ['/backoffice'], queryParams: { tab: 'annulations' } }
                        ]
                    },
                    {
                        label: 'Consultation',
                        items: [
                            { label: 'Historique Messages', icon: 'pi pi-fw pi-history', routerLink: ['/backoffice'], queryParams: { tab: 'historique' } }
                        ]
                    }
                ];
                break;

            case 'Client':
                this.model = [
                    {
                        label: 'Vue générale',
                        items: [
                            { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/client'], queryParams: { tab: 'dashboard' } }
                        ]
                    },
                    {
                        label: 'Mes transactions',
                        items: [
                            { label: 'Mes paiements', icon: 'pi pi-fw pi-send', routerLink: ['/client'], queryParams: { tab: 'paiements' } },
                            { label: 'Historique', icon: 'pi pi-fw pi-history', routerLink: ['/client'], queryParams: { tab: 'historique' } }
                        ]
                    }
                ];
                break;

            default:
                // ✅ Menu vide si rôle inconnu — aucune page exposée par erreur
                this.model = [];
                break;
        }
    }
}AppMenu
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
export class AppMenu implements OnInit {
    model: MenuItem[] = [];

    // Simule le rôle de l'utilisateur connecté
    // Plus tard tu remplaceras ça par ton AuthService
    private role: string = this.getUserRole();

    private getUserRole(): string {
        // Remplace par ton vrai service d'auth
        // Ex: return this.authService.currentUser?.role;
        return localStorage.getItem('role') ?? 'admin';
    }

    ngOnInit() {
        if (this.role === 'admin') {
            this.model = [
                {
                    label: 'Administration',
                    items: [
                        { label: 'Gestion des utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/admin/utilisateurs'] },
                        { label: 'Paramétrage', icon: 'pi pi-fw pi-cog', routerLink: ['/admin/parametrage'] },
                        { label: 'Mise à jour de l\'annuaire', icon: 'pi pi-fw pi-book', routerLink: ['/admin/annuaire'] }
                    ]
                }
            ];
        } else if (this.role === 'backoffice') {
            this.model = [
                {
                    label: 'Backoffice',
                    items: [
                        { label: 'Consulter Paiements', icon: 'pi pi-fw pi-table', routerLink: ['/backoffice'] },
                        { label: 'Generer Confirmation', icon: 'pi pi-fw pi-check-circle', routerLink: ['/backoffice'] },
                        { label: 'Generer Annulation', icon: 'pi pi-fw pi-times-circle', routerLink: ['/backoffice'] },
                        { label: 'Historique', icon: 'pi pi-fw pi-history', routerLink: ['/backoffice'] }
                    ]
                }
            ];
        }
    }
}
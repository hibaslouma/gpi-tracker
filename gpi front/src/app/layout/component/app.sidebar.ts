import { LayoutService } from '@/app/layout/service/layout.service';
import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AppMenu } from './app.menu';
import { AuthService } from '../../services/auth.service'; // ✅ chemin correct

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [AppMenu, RouterModule, CommonModule],
    template: `
        <div class="layout-sidebar">
            <div class="sidebar-user">
                <div class="user-avatar">{{ userInitials }}</div>
                <div class="user-greeting">
                    <span class="greeting-text">Bienvenue,</span>
                    <span class="user-name">{{ userName }}</span>
                    <span class="user-role">{{ userRoleLabel }}</span>
                </div>
            </div>
            <div class="sidebar-divider"></div>
            <app-menu [role]="currentRole"></app-menu>
            <div class="sidebar-divider"></div>
            <div class="sidebar-logout" (click)="logout()">
                <i class="pi pi-sign-out"></i>
                <span>Déconnexion</span>
            </div>
        </div>
    `,
    styles: [`
        .sidebar-user {
            display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem 1rem;
        }
        .user-avatar {
            width: 42px; height: 42px; border-radius: 50%; background: #E8421A;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 0.85rem; font-weight: 800; flex-shrink: 0;
        }
        .user-greeting { display: flex; flex-direction: column; gap: 0.1rem; }
        .greeting-text { font-size: 0.75rem; color: #94A3B8; font-weight: 400; }
        .user-name { font-weight: 700; font-size: 0.88rem; color: #1B2A4A; line-height: 1.2; }
        .user-role { font-size: 0.75rem; color: #E8421A; font-weight: 600; }
        .sidebar-divider { height: 1px; background: #e2e8f0; margin: 0 1rem; }
        .sidebar-logout {
            display: flex; align-items: center; gap: 0.75rem;
            padding: 1rem 1.25rem; cursor: pointer; color: #ef4444;
            font-weight: 600; font-size: 0.9rem; transition: background 0.2s;
        }
        .sidebar-logout:hover { background: #fef2f2; border-radius: 8px; }
    `]
})
export class AppSidebar implements OnInit, OnDestroy {
    layoutService: LayoutService = inject(LayoutService);
    router: Router = inject(Router);
    el: ElementRef = inject(ElementRef);
    authService: AuthService = inject(AuthService); // ✅ typage explicite

    userName = '';
    userInitials = '';
    userRoleLabel = '';
    currentRole = '';

    private outsideClickListener: ((event: MouseEvent) => void) | null = null;
    private destroy$ = new Subject<void>();

    constructor() {
        effect(() => {
            const state = this.layoutService.layoutState();
            if (this.layoutService.isDesktop()) {
                if (state.overlayMenuActive) this.bindOutsideClickListener();
                else this.unbindOutsideClickListener();
            } else {
                if (state.mobileMenuActive) this.bindOutsideClickListener();
                else this.unbindOutsideClickListener();
            }
        });
    }

    ngOnInit() {
        // Charger au démarrage
        this.loadUserFromToken();

        // Recharger à chaque changement de route
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.loadUserFromToken();
            this.onRouteChange(this.router.url);
        });

        this.onRouteChange(this.router.url);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.unbindOutsideClickListener();
    }

    loadUserFromToken() {
        // ✅ Via AuthService — plus de localStorage direct
        const token = this.authService.getToken();
        const role = this.authService.getRole();
        this.currentRole = role;

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                this.userName = payload.name || payload.preferred_username || 'Utilisateur';
                const parts = this.userName.trim().split(' ');
                this.userInitials = parts.length >= 2
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : this.userName.substring(0, 2).toUpperCase();
            } catch (e) {
                this.userName = 'Utilisateur';
                this.userInitials = 'U';
            }
        } else {
            this.userName = 'Utilisateur';
            this.userInitials = 'U';
        }

        switch (role) {
            case 'Admin': this.userRoleLabel = 'Super Administrateur'; break;
            case 'Backoffice': this.userRoleLabel = 'Opérateur Backoffice'; break;
            case 'Client': this.userRoleLabel = 'Client'; break;
            default: this.userRoleLabel = 'Utilisateur';
        }
    }

    logout() {
        // ✅ Via AuthService
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }

    private onRouteChange(path: string) {
        this.layoutService.layoutState.update((val) => ({
            ...val,
            activePath: path,
            overlayMenuActive: false,
            staticMenuMobileActive: false,
            mobileMenuActive: false,
            menuHoverActive: false
        }));
    }

    private bindOutsideClickListener() {
        if (!this.outsideClickListener) {
            this.outsideClickListener = (event: MouseEvent) => {
                if (this.isOutsideClicked(event)) {
                    this.layoutService.layoutState.update((val) => ({
                        ...val,
                        overlayMenuActive: false,
                        staticMenuMobileActive: false,
                        mobileMenuActive: false,
                        menuHoverActive: false
                    }));
                }
            };
            document.addEventListener('click', this.outsideClickListener);
        }
    }

    private unbindOutsideClickListener() {
        if (this.outsideClickListener) {
            document.removeEventListener('click', this.outsideClickListener);
            this.outsideClickListener = null;
        }
    }

    private isOutsideClicked(event: MouseEvent): boolean {
        const topbarButtonEl = document.querySelector('.topbar-start > button');
        const sidebarEl = this.el.nativeElement;
        return !(
            sidebarEl?.isSameNode(event.target as Node) ||
            sidebarEl?.contains(event.target as Node) ||
            topbarButtonEl?.isSameNode(event.target as Node) ||
            topbarButtonEl?.contains(event.target as Node)
        );
    }
}
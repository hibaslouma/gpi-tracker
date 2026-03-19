import { LayoutService } from '@/app/layout/service/layout.service';
import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AppMenu } from './app.menu';
import { AuthService } from '@/app/services/auth.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [AppMenu, RouterModule, CommonModule],
    template: `
        <div class="layout-sidebar">

            <div class="sidebar-user">
                <div class="user-avatar">
                    <i class="pi pi-user"></i>
                </div>
                <div class="user-greeting">
                    <span class="greeting-text">Bienvenue,</span>
                    <span class="user-name">{{ username }}</span>
                    <span class="user-role">Administrateur</span>
                </div>
            </div>

            <div class="sidebar-divider"></div>

            <app-menu></app-menu>

            <div class="sidebar-divider"></div>

            <div class="sidebar-logout" (click)="logout()">
                <i class="pi pi-sign-out"></i>
                <span>Déconnexion</span>
            </div>

        </div>
    `,
    styles: [`
        .sidebar-user {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1.25rem 1rem;
        }

        .user-avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #E8421A;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
            flex-shrink: 0;
        }

        .user-greeting {
            display: flex;
            flex-direction: column;
            gap: 0.1rem;
        }

        .greeting-text {
            font-size: 0.75rem;
            color: #94A3B8;
            font-weight: 400;
        }

        .user-name {
            font-weight: 700;
            font-size: 0.88rem;
            color: #1B2A4A;
            line-height: 1.2;
        }

        .user-role {
            font-size: 0.75rem;
            color: #E8421A;
            font-weight: 600;
        }

        .sidebar-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 0 1rem;
        }

        .sidebar-logout {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
            cursor: pointer;
            color: #ef4444;
            font-weight: 600;
            font-size: 0.9rem;
            transition: background 0.2s;
        }

        .sidebar-logout:hover {
            background: #fef2f2;
            border-radius: 8px;
        }
    `]
})
export class AppSidebar implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);
    router = inject(Router);
    el = inject(ElementRef);
    authService = inject(AuthService);

    username = '';

    private outsideClickListener: ((event: MouseEvent) => void) | null = null;
    private destroy$ = new Subject<void>();

    constructor() {
        effect(() => {
            const state = this.layoutService.layoutState();
            if (this.layoutService.isDesktop()) {
                if (state.overlayMenuActive) {
                    this.bindOutsideClickListener();
                } else {
                    this.unbindOutsideClickListener();
                }
            } else {
                if (state.mobileMenuActive) {
                    this.bindOutsideClickListener();
                } else {
                    this.unbindOutsideClickListener();
                }
            }
        });
    }

    ngOnInit() {
        // Récupérer le nom de l'utilisateur connecté via Keycloak
        this.username = this.authService.getUsername() || 'Super Administrateur';

        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntil(this.destroy$)
            )
            .subscribe((event) => {
                const navEvent = event as NavigationEnd;
                this.onRouteChange(navEvent.urlAfterRedirects);
            });
        this.onRouteChange(this.router.url);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.unbindOutsideClickListener();
    }

    async logout() {
        await this.authService.logout();  // ← Keycloak logout
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
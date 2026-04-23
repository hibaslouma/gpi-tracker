import { Component, computed, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { LayoutService } from '@/app/layout/service/layout.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: '[app-menuitem]',
    imports: [CommonModule, RouterModule, RippleModule],
    template: `
        @if (root() && isVisible()) {
            <div class="layout-menuitem-root-text">{{ item().label }}</div>
        }
        @if ((!hasRouterLink() || hasChildren()) && isVisible()) {
            <a [attr.href]="item().url" (click)="itemClick($event)" [ngClass]="item().class" [attr.target]="item().target" tabindex="0" pRipple>
                <i [ngClass]="item().icon" class="layout-menuitem-icon"></i>
                <span class="layout-menuitem-text">{{ item().label }}</span>
                @if (hasChildren()) {
                    <i class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                }
            </a>
        }
        @if (hasRouterLink() && !hasChildren() && isVisible()) {
            <a
                (click)="itemClick($event)"
                [ngClass]="item().class"
                [routerLink]="item().routerLink"
                [queryParams]="item().queryParams"
                [class.active-route]="isMenuItemActive()"
                [fragment]="item().fragment"
                [queryParamsHandling]="item().queryParamsHandling"
                [preserveFragment]="item().preserveFragment"
                [skipLocationChange]="item().skipLocationChange"
                [replaceUrl]="item().replaceUrl"
                [state]="item().state"
                [attr.target]="item().target"
                tabindex="0"
                pRipple
            >
                <i [ngClass]="item().icon" class="layout-menuitem-icon"></i>
                <span class="layout-menuitem-text">{{ item().label }}</span>
                @if (hasChildren()) {
                    <i class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                }
            </a>
        }
        @if (hasChildren() && isVisible() && (root() || isActive())) {
            <ul [animate.enter]="initialized() ? 'p-submenu-enter' : null" [animate.leave]="'p-submenu-leave'" [class.layout-root-submenulist]="root()">
                @for (child of item().items; track child?.label) {
                    <li app-menuitem [item]="child" [parentPath]="fullPath()" [root]="false" [class]="child['badgeClass']"></li>
                }
            </ul>
        }
    `,
    host: {
        '[class.active-menuitem]': 'isActive()',
        '[class.layout-root-menuitem]': 'root()'
    },
    styles: [
        `
            .p-submenu-enter {
                animation: p-animate-submenu-expand 450ms cubic-bezier(0.86, 0, 0.07, 1) forwards;
            }
            .p-submenu-leave {
                animation: p-animate-submenu-collapse 450ms cubic-bezier(0.86, 0, 0.07, 1) forwards;
            }
            @keyframes p-animate-submenu-expand {
                from { max-height: 0; overflow: hidden; }
                to   { max-height: 1000px; overflow: visible; }
            }
            @keyframes p-animate-submenu-collapse {
                from { max-height: 1000px; overflow: hidden; }
                to   { max-height: 0; overflow: hidden; }
            }
        `
    ]
})
export class AppMenuitem {
    layoutService = inject(LayoutService);
    router = inject(Router);

    item = input<any>(null);
    root = input<boolean>(false);
    parentPath = input<string | null>(null);

    isVisible  = computed(() => this.item()?.visible !== false);
    hasChildren = computed(() => this.item()?.items && this.item()?.items.length > 0);
    hasRouterLink = computed(() => !!this.item()?.routerLink);

    fullPath = computed(() => {
        const itemPath = this.item()?.path;
        if (!itemPath) return this.parentPath();
        const parent = this.parentPath();
        if (parent && !itemPath.startsWith(parent)) return parent + itemPath;
        return itemPath;
    });

    initialized = signal<boolean>(false);
    currentUrl  = signal<string>(this.router.url);

    // ── isActive: controls active-menuitem host class (parent highlight) ──
    isActive = computed(() => {
        const item = this.item();
        const url  = this.currentUrl();
        if (!item) return false;

        // Tab-based navigation — check queryParam in URL
        if (item?.routerLink && item?.queryParams?.['tab']) {
            return url.includes(`tab=${item.queryParams['tab']}`);
        }

        // Path-based navigation
        if (item?.path) {
            const activePath = this.layoutService.layoutState().activePath;
            return activePath?.startsWith(this.fullPath() ?? '') ?? false;
        }

        return false;
    });

    constructor() {
        // Keep currentUrl signal reactive on navigation
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentUrl.set(event.urlAfterRedirects || event.url);
        });
    }

    ngOnInit() {
        if (this.item()?.routerLink) {
            this.updateActiveStateFromRoute();
        }
    }

    ngAfterViewInit() {
        setTimeout(() => this.initialized.set(true));
    }

    // ── isMenuItemActive: controls active-route class on <a> tag ──────────
    isMenuItemActive(): boolean {
        const item = this.item();
        if (!item) return false;
        const url = this.currentUrl();

        // Tab-based: match both path and tab queryParam
        if (item?.routerLink && item?.queryParams?.['tab']) {
            return url.includes(`tab=${item.queryParams['tab']}`);
        }

        // Path-based: exact path match (ignore queryParams)
        if (item?.routerLink) {
            return url.split('?')[0] === item.routerLink[0];
        }

        return false;
    }

    updateActiveStateFromRoute() {
        const item = this.item();
        if (!item?.routerLink) return;

        const isRouteActive = this.router.isActive(item.routerLink[0], {
            paths: 'exact',
            queryParams: 'ignored',
            matrixParams: 'ignored',
            fragment: 'ignored'
        });

        if (isRouteActive) {
            const parentPath = this.parentPath();
            if (parentPath) {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: parentPath
                }));
            }
        }
    }

    itemClick(event: Event) {
        const item = this.item();
        if (item?.disabled) { event.preventDefault(); return; }
        if (item?.command)  { item.command({ originalEvent: event, item }); }

        if (this.hasChildren()) {
            if (this.isActive()) {
                this.layoutService.layoutState.update((val) => ({ ...val, activePath: this.parentPath() }));
            } else {
                this.layoutService.layoutState.update((val) => ({ ...val, activePath: this.fullPath(), menuHoverActive: true }));
            }
        } else {
            this.layoutService.layoutState.update((val) => ({
                ...val,
                overlayMenuActive: false,
                staticMenuMobileActive: false,
                mobileMenuActive: false,
                menuHoverActive: false
            }));
        }
    }
}
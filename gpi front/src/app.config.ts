import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router'; // ❌ supprimé withEnabledBlockingInitialNavigation
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { AuthInterceptor } from './app/services/auth.interceptor';
import { KeycloakService, KeycloakAngularModule } from 'keycloak-angular';

function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8180',
        realm: 'gpi',
        clientId: 'gpi-frontend',
      },
      initOptions: {
        onLoad: 'login-required',//redirige vers Keycloak si non connecté
        checkLoginIframe: false,
      },
    });
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
          appRoutes,
          withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })
          // ❌ withEnabledBlockingInitialNavigation() supprimé
        ),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideZoneChangeDetection({ eventCoalescing: true }),
        providePrimeNG({
          theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } }
        }),
        importProvidersFrom(KeycloakAngularModule),
        KeycloakService,
        {
          provide: APP_INITIALIZER,
          useFactory: initializeKeycloak,
          multi: true,
          deps: [KeycloakService]
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
    ]
};
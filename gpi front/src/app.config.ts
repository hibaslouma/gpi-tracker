import { ApplicationConfig, provideZonelessChangeDetection, inject } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { AuthService } from './app/services/auth.service';

const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      withEnabledBlockingInitialNavigation()
    ),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor])),
    provideZonelessChangeDetection(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.app-dark' }
      },
      translation: {
        accept: 'Oui',
        reject: 'Non',
        choose: 'Choisir',
        cancel: 'Annuler',
        emptyMessage: 'Aucun résultat',
        emptyFilterMessage: 'Aucun résultat trouvé',
        passwordPrompt: 'Entrez un mot de passe'
      }
    })
  ]
};
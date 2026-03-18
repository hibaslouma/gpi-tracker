import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { AuthService } from './app/services/auth.service';

const authService = new AuthService();

authService.init().then((authenticated) => {
  if (authenticated) {
    bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
  }
  // Si non authentifié → Keycloak redirige automatiquement vers sa page login
}).catch(err => {
  console.error('Keycloak init failed', err);
});
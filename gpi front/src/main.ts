import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { initKeycloak } from './app/services/auth.service';

initKeycloak().then(() => {
  bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
}).catch(err => console.error('Keycloak init failed', err));
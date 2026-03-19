import { Component } from '@angular/core';

// Cette page n'est jamais affichée
// Keycloak redirige automatiquement vers sa page login standard
@Component({
  selector: 'app-login',
  standalone: true,
  template: ``
})
export class Login {}
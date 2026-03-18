import { Component } from '@angular/core';

// Cette page n'est jamais affichée
// Keycloak redirige directement depuis main.ts
@Component({
  selector: 'app-login',
  standalone: true,
  template: ``
})
export class Login {}
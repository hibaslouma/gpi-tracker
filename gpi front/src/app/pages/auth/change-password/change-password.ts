import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, PasswordModule, InputTextModule],
  template: `
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen overflow-hidden">
      <div class="flex flex-col items-center justify-center">
        <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
          <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px; min-width: 400px;">
            <div class="text-center mb-8">
              <img src="logo-gpi.png" class="mb-8 w-24 mx-auto" />
              <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Changer votre mot de passe</div>
              <span class="text-muted-color font-medium">Vous devez définir un nouveau mot de passe pour continuer</span>
            </div>

            <div *ngIf="errorMessage"
                 style="background:#fff0f0; border:1px solid #ffcccc; color:#cc0000; border-radius:8px; padding:12px 16px; margin-bottom:16px; text-align:center; font-size:14px;">
              ⚠️ {{ errorMessage }}
            </div>

            <div *ngIf="successMessage"
                 style="background:#f0fff0; border:1px solid #ccffcc; color:#006600; border-radius:8px; padding:12px 16px; margin-bottom:16px; text-align:center; font-size:14px;">
              ✅ {{ successMessage }}
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <label class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Nouveau mot de passe</label>
              <p-password
                formControlName="newPassword"
                placeholder="Nouveau mot de passe"
                [toggleMask]="true"
                styleClass="mb-2"
                [fluid]="true"
                [feedback]="true"
              ></p-password>
              <small class="text-red-500" *ngIf="form.get('newPassword')?.invalid && form.get('newPassword')?.touched">
                Minimum 8 caractères.
              </small>

              <label class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2 mt-6">Confirmer le mot de passe</label>
              <p-password
                formControlName="confirmPassword"
                placeholder="Confirmer le mot de passe"
                [toggleMask]="true"
                styleClass="mb-2"
                [fluid]="true"
                [feedback]="false"
              ></p-password>
              <small class="text-red-500" *ngIf="form.errors?.['mismatch'] && form.get('confirmPassword')?.touched">
                Les mots de passe ne correspondent pas.
              </small>

              <p-button
                label="Confirmer"
                styleClass="w-full mt-6 login-orange-btn"
                type="submit"
                [disabled]="form.invalid || loading"
                [loading]="loading"
              ></p-button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  loading = false;
  errorMessage = '';
  successMessage = '';
  form;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private keycloak: KeycloakService  // Keycloak
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const newPassword = this.form.value.newPassword!;

    //Récupérer l'email depuis Keycloak
    const profile = await this.keycloak.loadUserProfile();
    const email = profile.email;

    if (!email) {
      this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      this.keycloak.login();
      return;
    }

    this.loading = true;

    //  Récupérer le token depuis Keycloak
    const token = await this.keycloak.getToken();

    //  Étape 1 — changer le mot de passe
    this.http.post<any>('http://localhost:8080/api/auth/change-password', {
      email,
      newPassword
    }, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).subscribe({
      next: () => {
        // Étape 2 — finaliser inscription
        this.http.patch<any>(
          'http://localhost:8080/api/auth/finaliser-inscription',
          {},
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
        ).subscribe({
          next: () => {
            this.loading = false;
            this.successMessage = 'Mot de passe changé avec succès !';

            setTimeout(() => {
              const roles = this.keycloak.getUserRoles();
              if (roles.includes('Admin')) {
                this.router.navigateByUrl('/admin');
              } else if (roles.includes('Backoffice')) {
                this.router.navigateByUrl('/backoffice');
              } else {
                this.router.navigateByUrl('/client');
              }
            }, 2000);
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'Erreur finalisation. Veuillez vous reconnecter.';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur lors du changement. Réessayez.';
      }
    });
  }
}
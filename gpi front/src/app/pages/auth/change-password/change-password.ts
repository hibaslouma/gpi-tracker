import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';

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
    private http: HttpClient
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

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = localStorage.getItem('temp_email');
    const oldPassword = localStorage.getItem('temp_password');
    const newPassword = this.form.value.newPassword!;

    if (!email || !oldPassword) {
      this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      this.router.navigateByUrl('/auth/login');
      return;
    }

    this.loading = true;

    // ✅ Étape 1 — changer le mot de passe
    this.http.post<any>('http://localhost:8080/api/auth/change-password', {
      email,
      oldPassword,
      newPassword
    }).subscribe({
      next: () => {

        // ✅ Étape 2 — se reconnecter avec le nouveau mot de passe
        this.http.post<any>(
          'http://localhost:8180/realms/gpi/protocol/openid-connect/token',
          new URLSearchParams({
            grant_type: 'password',
            client_id: 'gpi-frontend',
            username: email!,
            password: newPassword
          }).toString(),
          { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }) }
        ).subscribe({
          next: (tokenRes) => {
            const newToken = tokenRes.access_token;
            localStorage.setItem('token', newToken);

            // ✅ extrait le rôle depuis le nouveau token JWT
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            const roles: string[] = payload?.realm_access?.roles || [];
            const rolesLower = roles.map((r: string) => r.toLowerCase());
            let newRole = 'Client';
            if (rolesLower.includes('admin')) newRole = 'Admin';
            else if (rolesLower.includes('backoffice')) newRole = 'Backoffice';
            localStorage.setItem('role', newRole); // ✅ vrai rôle

            // ✅ Étape 3 — finaliser inscription
            this.http.patch<any>(
              'http://localhost:8080/api/auth/finaliser-inscription',
              {},
              { headers: new HttpHeaders({ Authorization: `Bearer ${newToken}` }) }
            ).subscribe({
              next: () => {
                this.loading = false;
                localStorage.removeItem('temp_email');
                localStorage.removeItem('temp_password');
                this.successMessage = 'Mot de passe changé avec succès !';

                setTimeout(() => {
                  if (newRole === 'Admin') {
                    this.router.navigateByUrl('/admin');
                  } else if (newRole === 'Backoffice') {
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
            }); // ✅ fin subscribe étape 3

          },
          error: () => {
            // ✅ fin error étape 2
            this.loading = false;
            this.errorMessage = 'Erreur reconnexion. Réessayez.';
          }
        }); // ✅ fin subscribe étape 2

      },
      error: (err) => {
        // ✅ fin error étape 1
        this.loading = false;
        console.error('Erreur changement mdp:', err);
        this.errorMessage = 'Erreur lors du changement. Réessayez.';
      }
    }); // ✅ fin subscribe étape 1
  }
}
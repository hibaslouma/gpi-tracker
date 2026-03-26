import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    RippleModule
  ],
  template: `
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
      <div class="flex flex-col items-center justify-center">
        <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
          <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
            <div class="text-center mb-8">
              <img src="logo-gpi.png" class="mb-8 w-24 mx-auto" />
              <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Se connecter à mon compte</div>
              <span class="text-muted-color font-medium">Continuer vers la plateforme</span>
            </div>

            <!-- MESSAGE ERREUR -->
            <div *ngIf="errorMessage"
                 style="background:#fff0f0; border:1px solid #ffcccc; color:#cc0000; border-radius:8px; padding:12px 16px; margin-bottom:16px; text-align:center; font-size:14px;">
              ⚠️ {{ errorMessage }}
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <!-- EMAIL -->
              <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
              <input
                pInputText
                id="email1"
                type="email"
                placeholder="Adresse e-mail"
                class="w-full md:w-120 mb-2"
                formControlName="email"
                autocomplete="email"
              />
              <small class="text-red-500" *ngIf="isInvalid('email')">
                <ng-container *ngIf="form.get('email')?.errors?.['required']">Email obligatoire.</ng-container>
                <ng-container *ngIf="form.get('email')?.errors?.['email']">Format email invalide (ex: nom@domaine.com).</ng-container>
              </small>

              <!-- PASSWORD -->
              <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2 mt-6">Mot de passe</label>
              <p-password
                id="password1"
                formControlName="password"
                placeholder="Mot de passe"
                [toggleMask]="true"
                styleClass="mb-2"
                [fluid]="true"
                [feedback]="false"
                autocomplete="current-password"
              ></p-password>

              <small class="text-red-500" *ngIf="isInvalid('password')">
                <ng-container *ngIf="form.get('password')?.errors?.['required']">Mot de passe obligatoire.</ng-container>
                <ng-container *ngIf="form.get('password')?.errors?.['minlength']">Minimum 8 caractères.</ng-container>
              </small>

              <!-- REMEMBER + FORGOT -->
              <div class="flex items-center justify-between mt-6 mb-8 gap-8">
                <div class="flex items-center">
                  <p-checkbox formControlName="remember" id="rememberme1" binary class="mr-2"></p-checkbox>
                  <label for="rememberme1">Rester connecté(e)</label>
                </div>
                <a class="font-medium no-underline ml-2 text-right cursor-pointer text-primary" routerLink="/auth/forgot-password">
                  Mot de passe oublié ?
                </a>
              </div>

              <!-- BUTTON -->
              <p-button
                label="Se connecter"
                styleClass="w-full login-orange-btn"
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
export class Login {
  loading = false;
  submitted = false;
  errorMessage = '';
  form;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember: [false]
    });
  }

  isInvalid(controlName: 'email' | 'password') {
    const c = this.form.get(controlName);
    return !!c && c.invalid && c.touched;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.form.value;

    this.authService.login(email!, password!).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        this.loading = false;

        if (res.role === 'Admin') {
    this.router.navigateByUrl('/admin');
} else if (res.role === 'Backoffice') {
    this.router.navigateByUrl('/backoffice');
} else {
    this.router.navigateByUrl('/client');
}
      },
      error: (err) => {
        this.loading = false;

        let errDesc = '';
        try {
          const errorObj = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
          errDesc = errorObj?.error_description || '';
        } catch (e) {
          errDesc = '';
        }

        if (err.status === 401 || err.status === 400) {
          if (errDesc.includes('Invalid user credentials')) {
            this.errorMessage = 'Email ou mot de passe incorrect.';
          } else if (errDesc.includes('Account is not fully set up')) {
            this.errorMessage = 'Compte non configuré. Contactez l\'administrateur.';
          } else if (errDesc.includes('Account disabled')) {
            this.errorMessage = 'Votre compte a été désactivé. Contactez l\'administrateur.';
          } else {
            this.errorMessage = 'Email ou mot de passe incorrect.';
          }
        } else {
          this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
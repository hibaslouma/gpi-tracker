import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
      <div class="flex flex-col items-center justify-center">
        <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
          <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px; max-width: 480px; text-align: center;">
            
            <!-- Icône -->
            <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
            
            <!-- Titre -->
            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">
              Mot de passe oublié ?
            </div>
            
            <!-- Message -->
            <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
              Pour réinitialiser votre mot de passe, veuillez contacter votre administrateur système.
            </p>

            <!-- Info admin -->
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #0369a1; font-weight: 600; margin-bottom: 4px;">📧 Contactez l'administrateur</p>
              <p style="color: #0369a1; font-size: 14px;">L'administrateur réinitialisera votre mot de passe et vous le communiquera.</p>
            </div>

            <!-- Retour -->
            <a routerLink="/auth/login" 
               style="display: inline-block; background: #e85d26; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              ← Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {}

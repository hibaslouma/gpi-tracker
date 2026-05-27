import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService, User, LogDTO } from '../../../services/user.service';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.scss'
})
export class Utilisateurs implements OnInit {

  private _searchQuery = '';
  selectedRole = 'Tous';
  showModal = false;
  showDeleteModal = false;
  showLogsModal = false;
  isEditing = false;
  selectedUser: User | null = null;
  generatedPassword = '';
  copied = false;
  formError = '';
  successMessage = '';
  isLoading = false;
  isSubmitting = false;
  isDeleting = false;
  currentPage = 1;
  itemsPerPage = 8;
  users: User[] = [];
  selectedUserLogs: LogDTO[] = [];
  newUser: Partial<User> = this.emptyUser();

  // Erreurs par champ
  errors: { [key: string]: string } = {};
  touched: { [key: string]: boolean } = {};

  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(val: string) { this._searchQuery = val; this.currentPage = 1; this.cdr.detectChanges(); }

  get filteredUsers(): User[] {
    return this.users.filter(u => {
      const matchSearch =
        (u.name || '').toLowerCase().includes(this._searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(this._searchQuery.toLowerCase());
      const matchRole = this.selectedRole === 'Tous' || u.role === this.selectedRole;
      return matchSearch && matchRole;
    });
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.itemsPerPage));
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  private emptyUser(): Partial<User> {
    return { firstName: '', lastName: '', name: '', email: '', phone: '', role: 'Client', active: true, password: '' };
  }

  constructor(private userService: UserService, protected cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.isLoading = true;
    this.users = [];
    this.cdr.detectChanges();
    this.userService.getAll().subscribe({
      next: (data) => { this.users = data; this.isLoading = false; this.cdr.detectChanges(); },
      error: (err) => { console.error('Erreur', err); this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  closeModal() { this.showModal = false; this.isSubmitting = false; this.cdr.detectChanges(); }
  closeDeleteModal() { this.showDeleteModal = false; this.isDeleting = false; this.cdr.detectChanges(); }
  closeLogsModal() { this.showLogsModal = false; this.cdr.detectChanges(); }

  openAddModal() {
    this.isEditing = false;
    this.copied = false;
    this.formError = '';
    this.errors = {};
    this.touched = {};
    this.generatedPassword = '';
    this.isSubmitting = false;
    this.newUser = { ...this.emptyUser(), password: this.generatePassword() };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(user: User) {
    this.isEditing = true;
    this.newUser = {
      ...user,
      firstName: user.name?.split(' ')[0] || '',
      lastName: user.name?.split(' ').slice(1).join(' ') || ''
    };
    this.selectedUser = user;
    this.generatedPassword = '';
    this.copied = false;
    this.formError = '';
    this.errors = {};
    this.touched = {};
    this.isSubmitting = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openLogs(user: User) {
    this.selectedUser = user;
    this.userService.getLogs(user.id!).subscribe({
      next: (logs) => { this.selectedUserLogs = logs; this.showLogsModal = true; this.cdr.detectChanges(); },
      error: () => { this.selectedUserLogs = []; this.showLogsModal = true; this.cdr.detectChanges(); }
    });
  }

  confirmDelete(user: User) {
    this.selectedUser = user;
    this.isDeleting = false;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  //  Prénom/Nom — bloque chiffres et caractères spéciaux à la saisie
  onNameInput(event: Event, field: 'firstName' | 'lastName') {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '');
    input.value = cleaned;
    this.newUser[field] = cleaned;
    this.validateField(field);
    this.cdr.detectChanges();
  }

  //  Téléphone — bloque les chiffres invalides dès la saisie
  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');

    // Si le premier chiffre n'est pas valide, on le supprime
    if (val.length > 0 && !/^[24579]/.test(val)) {
      val = val.slice(1);
    }

    val = val.slice(0, 8);
    input.value = val;
    this.newUser.phone = val;
    this.validateField('phone');
    this.cdr.detectChanges();
  }

  // Validation en temps réel à la sortie du champ (blur)
  onBlur(field: string) {
    this.touched[field] = true;
    this.validateField(field);
    this.cdr.detectChanges();
  }

  // Validation d'un champ spécifique
  validateField(field: string) {
    this.errors[field] = '';

    switch (field) {
      case 'firstName':
        if (!this.newUser.firstName || this.newUser.firstName.trim().length === 0)
          this.errors['firstName'] = 'Le prénom est obligatoire.';
        else if (this.newUser.firstName.trim().length < 2)
          this.errors['firstName'] = 'Minimum 2 caractères.';
        else if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(this.newUser.firstName.trim()))
          this.errors['firstName'] = 'Lettres uniquement.';
        break;

      case 'lastName':
        if (!this.newUser.lastName || this.newUser.lastName.trim().length === 0)
          this.errors['lastName'] = 'Le nom est obligatoire.';
        else if (this.newUser.lastName.trim().length < 2)
          this.errors['lastName'] = 'Minimum 2 caractères.';
        else if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(this.newUser.lastName.trim()))
          this.errors['lastName'] = 'Lettres uniquement.';
        break;

      case 'email':
        if (!this.newUser.email || this.newUser.email.trim().length === 0)
          this.errors['email'] = 'L\'email est obligatoire.';
        else if (!this.newUser.email.includes('@'))
          this.errors['email'] = 'L\'email doit contenir @.';
        else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.newUser.email.trim()))
          this.errors['email'] = 'Format invalide. Exemple : nom@domaine.com';
        break;

      case 'phone':
        if (this.newUser.phone && this.newUser.phone.trim().length > 0) {
          const phone = this.newUser.phone.trim();
          if (phone.length !== 8)
            this.errors['phone'] = 'Le téléphone doit contenir exactement 8 chiffres.';
          else if (!/^[24579]/.test(phone))
            this.errors['phone'] = 'Mobile : 2,4,5,9 — Fixe : 7';
        }
        break;
    }
  }

  //  Validation complète avant soumission
  private validateForm(): boolean {
    this.touched = { firstName: true, lastName: true, email: true, phone: true };
    ['firstName', 'lastName', 'email', 'phone'].forEach(f => this.validateField(f));

    if (this.errors['firstName'] || this.errors['lastName'] || this.errors['email'] || this.errors['phone']) {
      this.formError = 'Veuillez corriger les erreurs ci-dessous.';
      this.cdr.detectChanges();
      return false;
    }

    if (!this.newUser.role || !['Admin', 'Backoffice', 'Client'].includes(this.newUser.role)) {
      this.formError = 'Veuillez sélectionner un rôle valide.';
      this.cdr.detectChanges();
      return false;
    }

    if (!this.isEditing && (!this.newUser.password || this.newUser.password.length < 8)) {
      this.formError = 'Le mot de passe doit contenir au moins 8 caractères.';
      this.cdr.detectChanges();
      return false;
    }

    this.formError = '';
    return true;
  }

  // Replace the saveUser() method in utilisateurs.ts with this:

  saveUser() {
    if (!this.validateForm()) return;
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();

    const userData: User = {
      ...this.newUser as User,
      name: `${this.newUser.firstName} ${this.newUser.lastName}`.trim(),
      password: this.isEditing ? (this.generatedPassword || undefined as any) : this.newUser.password
    };

    if (this.isEditing && this.selectedUser) {
      this.userService.update(this.selectedUser.id!, userData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.cdr.detectChanges();
          this.loadUsers();
          this.showSuccess('Utilisateur modifié !');
        },
        error: (err) => {
          this.isSubmitting = false;
          this.formError = err?.error?.error || 'Erreur lors de la modification.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.create(userData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.cdr.detectChanges();
          this.loadUsers();
          this.showSuccess('Utilisateur créé !');
        },
        error: (err) => {
          this.isSubmitting = false;
          // ✅ Show specific error from backend (e.g. user already exists)
          if (err?.status === 409) {
            this.formError = 'Un utilisateur avec cet email ou username existe déjà dans Keycloak.';
          } else {
            this.formError = err?.error?.error || 'Erreur serveur. Veuillez réessayer.';
          }
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteUser() {
    if (!this.selectedUser || !this.selectedUser.id) return;
    if (this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();
    this.userService.delete(this.selectedUser.id).subscribe({
      next: () => {
        this.isDeleting = false; this.showDeleteModal = false; this.selectedUser = null;
        this.cdr.detectChanges(); this.loadUsers();
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        this.showSuccess('Utilisateur supprimé.');
      },
      error: (err) => { this.isDeleting = false; this.showDeleteModal = false; this.selectedUser = null; this.cdr.detectChanges(); console.error('Erreur suppression', err); }
    });
  }

  toggleActive(user: User) {
    const updated: User = { ...user, active: !user.active };
    this.userService.update(user.id!, updated).subscribe({
      next: () => { this.cdr.detectChanges(); this.loadUsers(); this.showSuccess(`Compte ${updated.active ? 'activé' : 'désactivé'}.`); },
      error: () => console.error('Erreur toggle')
    });
  }

  filterByRole(role: string) { this.selectedRole = role; this.currentPage = 1; this.cdr.detectChanges(); }
  goToPage(page: number) { if (page >= 1 && page <= this.totalPages) { this.currentPage = page; this.cdr.detectChanges(); } }
  previousPage() { this.goToPage(this.currentPage - 1); }
  nextPage() { this.goToPage(this.currentPage + 1); }

  generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  }

  copyPasswordText(pwd: string) {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    this.copied = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
  }

  refreshGeneratedPassword() { this.generatedPassword = this.generatePassword(); this.copied = false; this.cdr.detectChanges(); }

  getLogActionClass(action: string): string {
    if (action.includes('Création'))         return 'log-create';
    if (action.includes('Suppression'))      return 'log-delete';
    if (action.includes('Désactivation'))    return 'log-warning';
    if (action.includes('Réinitialisation')) return 'log-reset';
    if (action.includes('Activation'))       return 'log-active';
    return 'log-edit';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 3000);
  }
}
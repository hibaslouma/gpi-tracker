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

  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(val: string) { this._searchQuery = val; this.currentPage = 1; this.cdr.detectChanges(); }

  get filteredUsers(): User[] {
    return this.users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
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
    return { name: '', email: '', phone: '', role: 'Client', active: true, password: '' };
  }

  constructor(
    private userService: UserService,
    protected cdr: ChangeDetectorRef
  ) {}

  closeModal() {
    this.showModal = false;
    this.isSubmitting = false;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.isDeleting = false;
    this.cdr.detectChanges();
  }

  closeLogsModal() {
    this.showLogsModal = false;
    this.cdr.detectChanges();
  }

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.isLoading = true;
    this.users = [];
    this.cdr.detectChanges();
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.copied = false;
    this.formError = '';
    this.generatedPassword = '';
    this.isSubmitting = false;
    this.newUser = { ...this.emptyUser(), password: this.generatePassword() };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(user: User) {
    this.isEditing = true;
    this.newUser = { ...user };
    this.selectedUser = user;
    this.generatedPassword = '';
    this.copied = false;
    this.formError = '';
    this.isSubmitting = false;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openLogs(user: User) {
    this.selectedUser = user;
    this.userService.getLogs(user.id!).subscribe({
      next: (logs) => {
        this.selectedUserLogs = logs;
        this.showLogsModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedUserLogs = [];
        this.showLogsModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  confirmDelete(user: User) {
    this.selectedUser = user;
    this.isDeleting = false;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  saveUser() {
    if (!this.validateForm()) return;
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();

    const userData: User = {
      ...this.newUser as User,
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
        error: () => {
          this.isSubmitting = false;
          this.formError = 'Erreur lors de la modification.';
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
        error: () => {
          this.isSubmitting = false;
          this.formError = 'Email déjà utilisé ou erreur serveur.';
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
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.selectedUser = null;
        this.cdr.detectChanges();
        this.loadUsers();
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        this.showSuccess('Utilisateur supprimé.');
      },
      error: (err) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.selectedUser = null;
        this.cdr.detectChanges();
        console.error('Erreur suppression', err);
      }
    });
  }

  toggleActive(user: User) {
    const updated: User = { ...user, active: !user.active };
    this.userService.update(user.id!, updated).subscribe({
      next: () => {
        this.cdr.detectChanges();
        this.loadUsers();
        this.showSuccess(`Compte ${updated.active ? 'activé' : 'désactivé'}.`);
      },
      error: () => console.error('Erreur toggle')
    });
  }

  private validateForm(): boolean {
    if (!this.newUser.name || this.newUser.name.trim().length < 3) {
      this.formError = 'Le nom doit contenir au moins 3 caractères.';
      this.cdr.detectChanges(); return false;
    }
    if (!this.newUser.email || !this.newUser.email.includes('@')) {
      this.formError = 'Veuillez saisir une adresse email valide.';
      this.cdr.detectChanges(); return false;
    }
    this.formError = '';
    return true;
  }

  filterByRole(role: string) {
    this.selectedRole = role;
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }
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

  refreshGeneratedPassword() {
    this.generatedPassword = this.generatePassword();
    this.copied = false;
    this.cdr.detectChanges();
  }

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
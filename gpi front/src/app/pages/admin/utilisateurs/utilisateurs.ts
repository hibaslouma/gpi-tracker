import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface User {
  id: number;
  initials: string;
  name: string;
  email: string;
  phone: string;
  role: 'Backoffice' | 'Client';
  active: boolean;
  password?: string;
  createdAt: string;
  lastLogin: string;
}

interface Log {
  date: string;
  action: string;
  admin: string;
}

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.scss'
})
export class Utilisateurs {

  // ─── État UI ───────────────────────────────────────────────
  private _searchQuery = '';
  selectedRole = 'Tous';
  showModal = false;
  showDeleteModal = false;
  showLogsModal = false;
  isEditing = false;
  selectedUser: User | null = null;
  generatedPassword = '';
  copied = false;

  // ─── Messages feedback (remplace alert()) ─────────────────
  formError = '';
  successMessage = '';

  // ─── Recherche avec reset pagination ──────────────────────
  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(val: string) {
    this._searchQuery = val;
    this.currentPage = 1;  // CORRECTION : reset page à chaque recherche
  }

  // ─── Pagination ────────────────────────────────────────────
  currentPage = 1;
  itemsPerPage = 8;

  // ─── Logs par utilisateur ─────────────────────────────────
  userLogs: { [userId: number]: Log[] } = {
    1: [
      { date: '27/02/2026 10:30', action: 'Création compte', admin: 'Super Admin' },
      { date: '26/02/2026 14:15', action: 'Modification', admin: 'Super Admin' },
    ],
    2: [
      { date: '25/02/2026 09:00', action: 'Création compte', admin: 'Super Admin' },
      { date: '24/02/2026 11:00', action: 'Réinitialisation mdp', admin: 'Super Admin' },
    ],
    3: [
      { date: '20/02/2026 11:45', action: 'Création compte', admin: 'Super Admin' },
      { date: '10/01/2026 16:20', action: 'Désactivation', admin: 'Super Admin' },
    ],
    4: [{ date: '10/06/2024 09:00', action: 'Création compte', admin: 'Super Admin' }],
    5: [{ date: '05/09/2024 10:00', action: 'Création compte', admin: 'Super Admin' }],
    6: [{ date: '12/11/2024 08:30', action: 'Création compte', admin: 'Super Admin' }],
  };

  // ─── Données utilisateurs ──────────────────────────────────
  users: User[] = [
    { id: 1, initials: 'AB', name: 'Ahmed Ben Ali',   email: 'ahmed@gpi.tn',  phone: '+216 22 111 222', role: 'Backoffice', active: true,  password: 'Ab@123!xyz', createdAt: '01/01/2024', lastLogin: '27/02/2026' },
    { id: 2, initials: 'SM', name: 'Sara Mansouri',   email: 'sara@gpi.tn',   phone: '+216 55 333 444', role: 'Client',     active: true,  password: 'Sm@456!abc', createdAt: '15/03/2024', lastLogin: '26/02/2026' },
    { id: 3, initials: 'KT', name: 'Karim Trabelsi',  email: 'karim@gpi.tn',  phone: '+216 98 555 666', role: 'Client',     active: false, password: 'Kt@789!def', createdAt: '20/05/2024', lastLogin: '10/01/2026' },
    { id: 4, initials: 'LB', name: 'Leila Bouaziz',   email: 'leila@gpi.tn',  phone: '+216 25 777 888', role: 'Backoffice', active: true,  password: 'Lb@321!ghi', createdAt: '10/06/2024', lastLogin: '25/02/2026' },
    { id: 5, initials: 'MH', name: 'Mohamed Hamdi',   email: 'med@gpi.tn',    phone: '+216 50 999 000', role: 'Client',     active: true,  password: 'Mh@654!jkl', createdAt: '05/09/2024', lastLogin: '27/02/2026' },
    { id: 6, initials: 'RK', name: 'Rim Khelifi',     email: 'rim@gpi.tn',    phone: '+216 23 444 555', role: 'Backoffice', active: true,  password: 'Rk@987!mno', createdAt: '12/11/2024', lastLogin: '24/02/2026' },
  ];

  newUser: Partial<User> = { name: '', email: '', phone: '', role: 'Client', active: true, password: '' };

  // ─── Getters filtre + pagination ──────────────────────────
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

  // ─── Logs utilisateur sélectionné ─────────────────────────
  get selectedUserLogs(): Log[] {
    if (!this.selectedUser) return [];
    return this.userLogs[this.selectedUser.id] || [];
  }

  // ─── Génération mot de passe ──────────────────────────────
  generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // ─── Modales ──────────────────────────────────────────────
  openAddModal() {
    this.isEditing = false;
    this.copied = false;
    this.formError = '';
    this.generatedPassword = '';
    this.newUser = { name: '', email: '', phone: '', role: 'Client', active: true, password: this.generatePassword() };
    this.showModal = true;
  }

  openEditModal(user: User) {
    this.isEditing = true;
    this.newUser = { ...user };
    this.selectedUser = user;
    this.generatedPassword = '';
    this.copied = false;
    this.formError = '';
    this.showModal = true;
  }

  openLogs(user: User) {
    this.selectedUser = user;
    this.showLogsModal = true;
  }

  // ─── Validation formulaire ────────────────────────────────
  private validateForm(): boolean {
    if (!this.newUser.name || this.newUser.name.trim().length < 3) {
      this.formError = 'Le nom doit contenir au moins 3 caractères.';
      return false;
    }
    if (!this.newUser.email || !this.newUser.email.includes('@')) {
      this.formError = 'Veuillez saisir une adresse email valide.';
      return false;
    }
    // Vérifier email unique (sauf en mode édition sur le même utilisateur)
    const emailExists = this.users.some(u =>
      u.email === this.newUser.email && (!this.isEditing || u.id !== this.selectedUser?.id)
    );
    if (emailExists) {
      this.formError = 'Cet email est déjà utilisé par un autre utilisateur.';
      return false;
    }
    this.formError = '';
    return true;
  }

  // ─── Sauvegarde utilisateur ───────────────────────────────
  saveUser() {
    if (!this.validateForm()) return;

    const today = new Date().toLocaleDateString('fr-FR');

    if (this.isEditing && this.selectedUser) {
      const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
      const updatedUser = { ...this.selectedUser, ...this.newUser } as User;
      if (this.generatedPassword) {
        updatedUser.password = this.generatedPassword;
      }
      this.users[index] = updatedUser;
      if (!this.userLogs[this.selectedUser.id]) this.userLogs[this.selectedUser.id] = [];
      this.userLogs[this.selectedUser.id].unshift({ date: today, action: 'Modification', admin: 'Super Admin' });
      if (this.generatedPassword) {
        this.userLogs[this.selectedUser.id].unshift({ date: today, action: 'Réinitialisation mdp', admin: 'Super Admin' });
      }
      this.showModal = false;
      this.showSuccess('Utilisateur modifié avec succès.');
    } else {
      const newId = Math.max(...this.users.map(u => u.id), 0) + 1;

      // CORRECTION : filtre les mots vides avant de générer les initiales
      const initials = this.newUser.name!
        .split(' ')
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const newUser: User = {
        id: newId,
        initials,
        name: this.newUser.name!.trim(),
        email: this.newUser.email!.trim(),
        phone: this.newUser.phone || '',
        role: this.newUser.role as 'Backoffice' | 'Client',
        active: true,
        password: this.newUser.password,
        createdAt: today,
        lastLogin: '-'
      };
      this.users.push(newUser);
      this.userLogs[newId] = [{ date: today, action: 'Création compte', admin: 'Super Admin' }];
      this.showModal = false;
      this.showSuccess('Utilisateur créé avec succès.');
    }
  }

  // ─── Suppression ──────────────────────────────────────────
  confirmDelete(user: User) {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  deleteUser() {
    if (!this.selectedUser) return;
    this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
    this.showDeleteModal = false;
    this.showSuccess('Utilisateur supprimé.');
    // Corriger la page si on supprime le dernier élément d'une page
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  // ─── NOUVEAU : Toggle actif/inactif ───────────────────────
  toggleActive(user: User) {
    const index = this.users.findIndex(u => u.id === user.id);
    this.users[index].active = !this.users[index].active;
    const action = this.users[index].active ? 'Activation' : 'Désactivation';
    const today = new Date().toLocaleDateString('fr-FR');
    if (!this.userLogs[user.id]) this.userLogs[user.id] = [];
    this.userLogs[user.id].unshift({ date: today, action, admin: 'Super Admin' });
    this.showSuccess(`Compte ${this.users[index].active ? 'activé' : 'désactivé'}.`);
  }

  // ─── Filtre par rôle avec reset page ─────────────────────
  filterByRole(role: string) {
    this.selectedRole = role;
    this.currentPage = 1;
  }

  // ─── Pagination ────────────────────────────────────────────
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  previousPage() { this.goToPage(this.currentPage - 1); }
  nextPage()     { this.goToPage(this.currentPage + 1); }

  // ─── Mot de passe ─────────────────────────────────────────
  copyPasswordText(pwd: string) {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  refreshGeneratedPassword() {
    this.generatedPassword = this.generatePassword();
    this.copied = false;
  }

  // ─── Classe CSS des logs ──────────────────────────────────
  getLogActionClass(action: string): string {
    if (action.includes('Création'))       return 'log-create';
    if (action.includes('Suppression'))    return 'log-delete';
    if (action.includes('Désactivation'))  return 'log-warning';
    if (action.includes('Réinitialisation')) return 'log-reset';
    if (action.includes('Activation'))     return 'log-active';
    return 'log-edit';
  }

  // ─── Message succès temporaire ────────────────────────────
  private showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }
}

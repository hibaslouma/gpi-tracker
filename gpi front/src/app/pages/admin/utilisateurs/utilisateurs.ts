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

  searchQuery = '';
  selectedRole = 'Tous';
  showModal = false;
  showDeleteModal = false;
  showLogsModal = false;
  isEditing = false;
  selectedUser: User | null = null;
  generatedPassword = '';
  copied = false;

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

  users: User[] = [
    { id: 1, initials: 'AB', name: 'Ahmed Ben Ali', email: 'ahmed@gpi.tn', phone: '+216 22 111 222', role: 'Backoffice', active: true, password: 'Ab@123!xyz', createdAt: '01/01/2024', lastLogin: '27/02/2026' },
    { id: 2, initials: 'SM', name: 'Sara Mansouri', email: 'sara@gpi.tn', phone: '+216 55 333 444', role: 'Client', active: true, password: 'Sm@456!abc', createdAt: '15/03/2024', lastLogin: '26/02/2026' },
    { id: 3, initials: 'KT', name: 'Karim Trabelsi', email: 'karim@gpi.tn', phone: '+216 98 555 666', role: 'Client', active: false, password: 'Kt@789!def', createdAt: '20/05/2024', lastLogin: '10/01/2026' },
    { id: 4, initials: 'LB', name: 'Leila Bouaziz', email: 'leila@gpi.tn', phone: '+216 25 777 888', role: 'Backoffice', active: true, password: 'Lb@321!ghi', createdAt: '10/06/2024', lastLogin: '25/02/2026' },
    { id: 5, initials: 'MH', name: 'Mohamed Hamdi', email: 'med@gpi.tn', phone: '+216 50 999 000', role: 'Client', active: true, password: 'Mh@654!jkl', createdAt: '05/09/2024', lastLogin: '27/02/2026' },
    { id: 6, initials: 'RK', name: 'Rim Khelifi', email: 'rim@gpi.tn', phone: '+216 23 444 555', role: 'Backoffice', active: true, password: 'Rk@987!mno', createdAt: '12/11/2024', lastLogin: '24/02/2026' },
  ];

  newUser: Partial<User> = { name: '', email: '', phone: '', role: 'Client', active: true, password: '' };

  get filteredUsers(): User[] {
    return this.users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.selectedRole === 'Tous' || u.role === this.selectedRole;
      return matchSearch && matchRole;
    });
  }

  get selectedUserLogs(): Log[] {
    if (!this.selectedUser) return [];
    return this.userLogs[this.selectedUser.id] || [];
  }

  generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  openAddModal() {
    this.isEditing = false;
    this.copied = false;
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
    this.showModal = true;
  }

  openLogs(user: User) {
    this.selectedUser = user;
    this.showLogsModal = true;
  }

  saveUser() {
    if (!this.newUser.name || !this.newUser.email) return;
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
    } else {
      const newId = this.users.length + 1;
      const initials = this.newUser.name!.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const newUser: User = {
        id: newId,
        initials,
        name: this.newUser.name!,
        email: this.newUser.email!,
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
    }
  }

  confirmDelete(user: User) {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  deleteUser() {
    this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
    this.showDeleteModal = false;
  }

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

  getLogActionClass(action: string): string {
    if (action.includes('Création')) return 'log-create';
    if (action.includes('Suppression')) return 'log-delete';
    if (action.includes('Désactivation')) return 'log-warning';
    if (action.includes('Réinitialisation')) return 'log-reset';
    if (action.includes('Activation')) return 'log-active';
    return 'log-edit';
  }
}
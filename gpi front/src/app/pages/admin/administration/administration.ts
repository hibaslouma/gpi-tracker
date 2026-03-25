import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService, User } from '../../../services/user.service';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './administration.html',
  styleUrl: './administration.scss'
})
export class Administration implements OnInit {

  users: User[] = [];
  isLoading = false;

  get backofficeCount(): number {
    return this.users.filter(u => u.role === 'Backoffice').length;
  }

  get clientCount(): number {
    return this.users.filter(u => u.role === 'Client').length;
  }

  get totalCount(): number {
    return this.users.length;
  }

  get activeCount(): number {
    return this.users.filter(u => u.active).length;
  }

  get recentUsers(): User[] {
    return this.users.slice(-5).reverse();
  }

  constructor(
    private router: Router,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }
}
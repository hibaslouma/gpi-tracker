import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface RecentUser {
  initials: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './administration.html',
  styleUrl: './administration.scss'
})
export class Administration {

  private allUsers = [
    { initials: 'AB', name: 'Ahmed Ben Ali',  email: 'ahmed@gpi.tn', role: 'Backoffice', active: true  },
    { initials: 'SM', name: 'Sara Mansouri',  email: 'sara@gpi.tn',  role: 'Client',     active: true  },
    { initials: 'KT', name: 'Karim Trabelsi', email: 'karim@gpi.tn', role: 'Client',     active: false },
    { initials: 'LB', name: 'Leila Bouaziz',  email: 'leila@gpi.tn', role: 'Backoffice', active: true  },
    { initials: 'MH', name: 'Mohamed Hamdi',  email: 'med@gpi.tn',   role: 'Client',     active: true  },
    { initials: 'RK', name: 'Rim Khelifi',    email: 'rim@gpi.tn',   role: 'Backoffice', active: true  },
  ];

  get backofficeCount(): number {
    return this.allUsers.filter(u => u.role === 'Backoffice').length;
  }

  get clientCount(): number {
    return this.allUsers.filter(u => u.role === 'Client').length;
  }

  get totalCount(): number {
    return this.allUsers.length;
  }

  get activeCount(): number {
    return this.allUsers.filter(u => u.active).length;
  }

  get recentUsers(): RecentUser[] {
    return this.allUsers.slice(-5).reverse();
  }

  constructor(private router: Router) {}

  navigate(route: string) {
    this.router.navigate([route]);
  }
}
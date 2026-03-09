import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './administration.html',
  styleUrl: './administration.scss'
})
export class Administration {

  recentUsers = [
    { initials: 'AB', name: 'Ahmed Ben Ali', email: 'ahmed@gpi.tn', role: 'Backoffice', active: true },
    { initials: 'SM', name: 'Sara Mansouri', email: 'sara@gpi.tn', role: 'Client', active: true },
    { initials: 'KT', name: 'Karim Trabelsi', email: 'karim@gpi.tn', role: 'Client', active: false },
    { initials: 'LB', name: 'Leila Bouaziz', email: 'leila@gpi.tn', role: 'Backoffice', active: true },
    { initials: 'MH', name: 'Mohamed Hamdi', email: 'med@gpi.tn', role: 'Client', active: true },
  ];

  constructor(private router: Router) {}

  navigate(route: string) {
    this.router.navigate([route]);
  }
}

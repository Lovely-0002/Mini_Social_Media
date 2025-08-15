import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';

  constructor(private api: ApiService, private router: Router) {}

  register() {
    this.api.register({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: () => { alert('Registered! Please login.'); this.router.navigate(['/login']); },
      error: err => alert(err.error.error)
    });
  }
}

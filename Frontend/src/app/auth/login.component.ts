import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private api: ApiService, private router: Router) {}

  login() {
    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: () => { this.router.navigate(['/feed']); },
      error: err => alert(err.error.error)
    });
  }
}

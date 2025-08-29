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
    console.log('🔐 Attempting login...');
    
    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        console.log('✅ Login response:', response);
        
        // Store user data in localStorage
        if (response.user) {
          localStorage.setItem('userId', response.user._id);
          localStorage.setItem('userName', response.user.name);
          localStorage.setItem('userEmail', response.user.email);
          
          if (response.user.avatar) {
            localStorage.setItem('userAvatar', response.user.avatar);
          }
          
          console.log('💾 Stored userId in localStorage:', response.user._id);
          
          // Navigate to feed
          this.router.navigate(['/feed']);
          alert('Login successful!');
        } else {
          console.error('❌ No user data in login response');
          alert('Login successful but user data missing. Please try again.');
        }
      },
      error: err => {
        console.error('❌ Login failed:', err);
        const msg = err?.error?.error || 'Login failed: Unknown error';
        alert(msg);
      }
    });
  }

  // Debug method to check localStorage
  checkStorage() {
    console.log('🔍 Current localStorage:');
    console.log('userId:', localStorage.getItem('userId'));
    console.log('userName:', localStorage.getItem('userName'));
    console.log('userEmail:', localStorage.getItem('userEmail'));
  }
}
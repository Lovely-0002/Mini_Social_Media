import { Component } from '@angular/core';
import { ApiService } from '../services/api.service'; // Or AiService if you use separate AI service
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-caption',
  standalone: true,               // Mark as standalone
  imports: [CommonModule, FormsModule],  // Import necessary modules
  templateUrl: './caption.component.html',
  styleUrls: ['./caption.component.css'] // optional, keep if you have the CSS file
})
export class CaptionComponent {
  mood = '';
  keywords = '';
  caption = '';
  isLoading = false;
  error = '';

  constructor(private apiService: ApiService) {}

  generateCaption() {
    this.error = '';
    if (!this.mood.trim() || !this.keywords.trim()) {
      this.error = 'Please enter both mood and keywords.';
      return;
    }

    this.isLoading = true;

    this.apiService.generateCaption(this.mood.trim(), this.keywords.trim()).subscribe({
      next: (res) => {
        this.caption = res.caption;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to generate caption. Please try again.';
        console.error('Caption error:', err);
        this.isLoading = false;
      }
    });
  }
}

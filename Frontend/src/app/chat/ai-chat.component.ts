import { Component } from '@angular/core';
import { ApiService } from '../services/api.service'; // Or AiService if separated
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-chat',
  standalone: true, // <-- mark as standalone
  imports: [CommonModule, FormsModule], // <-- enable *ngIf, *ngFor, ngModel, etc.
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css']
})
export class AiChatComponent {
  userMessage = '';
  messages: { role: string; content: string }[] = [];

  constructor(private apiService: ApiService) {}

  sendMessage() {
    const trimmedMessage = this.userMessage.trim();
    if (!trimmedMessage) return;

    // Add user message to chat
    this.messages.push({ role: 'user', content: trimmedMessage });

    // Call the AI chat endpoint
    this.apiService.chat(this.messages).subscribe({
      next: (res) => {
        // Add AI reply to chat
        this.messages.push({ role: 'assistant', content: res.reply });
      },
      error: (err) => {
        console.error('AI chat error:', err);
        this.messages.push({ role: 'assistant', content: 'Sorry, AI is currently unavailable.' });
      }
    });

    this.userMessage = '';
  }
}

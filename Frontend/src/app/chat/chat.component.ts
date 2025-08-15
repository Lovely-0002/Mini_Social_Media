import { Component, OnInit } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  socket!: Socket;
  userId!: string;
  targetUserId = '';
  messageText = '';
  messages: { fromUserId: string; toUserId: string; message: string; timestamp: string }[] = [];

  constructor(private api: ApiService, private http: HttpClient) {}

  ngOnInit() {
    // Get the logged-in user profile (cookies already handled in ApiService)
    this.api.getProfile().subscribe((user: any) => {
      this.userId = user._id;

      // Connect socket.io with cookies and userId
      this.socket = io('http://localhost:5000', {
        query: { userId: this.userId },
        withCredentials: true
      });

      // Listen for incoming messages
      this.socket.on('private_message', (msg) => {
        this.messages.push(msg);
      });
    });
  }

  sendMessage() {
    if (!this.messageText || !this.targetUserId) return;

    // Emit message via socket.io
    this.socket.emit('private_message', {
      toUserId: this.targetUserId,
      message: this.messageText
    });

    // Add the message locally for instant feedback
    this.messages.push({
      fromUserId: this.userId,
      toUserId: this.targetUserId,
      message: this.messageText,
      timestamp: new Date().toISOString()
    });

    this.messageText = '';
  }
}

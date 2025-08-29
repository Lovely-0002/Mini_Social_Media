import { Component, OnInit, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../services/api.service';

interface ChatMessage {
  _id?: string;
  fromUserId: string | any;
  toUserId: string | any;
  message: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
  tempId?: string;
}

interface Conversation {
  name: string;
  email: string;
  lastMessage: string;
  lastMessageTime: string;
  isOnline?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  socket!: Socket;
  userId!: string;
  targetUserName = '';
  messageText = '';
  messages: ChatMessage[] = [];
  conversations: Conversation[] = [];
  isLoading = false;
  isSending = false;
  error = '';
  isConnected = false;
  retryCount = 0;
  maxRetries = 3;

  constructor(private api: ApiService, private http: HttpClient) {}

  ngOnInit() {
    this.initializeChat();
    this.loadConversations();
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  initializeChat() {
    this.api.getProfile().subscribe({
      next: (user: any) => {
        this.userId = user._id;
        this.setupSocket();
      },
      error: (err) => {
        this.error = 'Failed to get user profile';
        console.error('Profile error:', err);
      }
    });
  }

  setupSocket() {
    this.socket = io('http://localhost:5000', {
      query: { userId: this.userId },
      withCredentials: true,
      timeout: 10000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.retryCount = 0;
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('⚠️ Socket disconnected');
    });

    this.socket.on('private_message', (msg: ChatMessage) => {
      console.log('📨 Received message:', msg);

      if (
        (msg.fromUserId?.name === this.targetUserName && msg.toUserId === this.userId) ||
        (msg.toUserId?.name === this.targetUserName && msg.fromUserId === this.userId)
      ) {
        const exists = this.messages.find(
          (m) =>
            m._id === msg._id ||
            (m.tempId &&
              m.message === msg.message &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 5000)
        );

        if (!exists) {
          this.messages.push(msg);
        }
      }

      this.loadConversations();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.error = 'Failed to connect to chat server';
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.error = '';
    });
  }

  loadConversations() {
    this.api.getConversations().subscribe({
      next: (data: any) => {
        this.conversations = data.conversations || [];
      },
      error: (err) => {
        console.error('❌ Failed to load conversations:', err);
      }
    });
  }

  selectConversation(userName: string) {
    this.targetUserName = userName;
    this.messages = [];
    this.error = '';
    this.loadChatHistory();
  }

  loadChatHistory() {
    if (!this.targetUserName) return;

    this.isLoading = true;
    this.api.getChatHistory(this.targetUserName).subscribe({
      next: (data: any) => {
        this.messages = data.messages || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load chat history';
        console.error('❌ Chat history error:', err);
        this.isLoading = false;
      }
    });
  }

  async sendMessage() {
    if (!this.messageText.trim() || !this.targetUserName || this.isSending) {
      this.error = 'Please enter a message and select a user';
      return;
    }

    if (!navigator.onLine) {
      this.error = 'You are offline. Please check your connection.';
      return;
    }

    const messageData = {
      toUserName: this.targetUserName,
      message: this.messageText.trim()
    };

    const tempMessage: ChatMessage = {
      tempId: Date.now().toString(),
      fromUserId: this.userId,
      toUserId: this.targetUserName,
      message: messageData.message,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    this.messages.push(tempMessage);
    const originalMessage = this.messageText;
    this.messageText = '';
    this.isSending = true;
    this.error = '';

    try {
      const response = await this.sendMessageWithRetry(messageData);

      const index = this.messages.findIndex((m) => m.tempId === tempMessage.tempId);
      if (index !== -1) {
        this.messages[index] = { ...response.data, status: 'sent' };
      }

      if (this.socket && this.isConnected) {
        this.socket.emit('private_message', messageData);
      }

      console.log('✅ Message sent successfully');
    } catch (error: any) {
      console.error('❌ Send message error:', error);

      const index = this.messages.findIndex((m) => m.tempId === tempMessage.tempId);
      if (index !== -1) {
        this.messages[index].status = 'failed';
      }

      this.error = error.error?.error || 'Failed to send message. Click to retry.';
      this.messageText = originalMessage;
    } finally {
      this.isSending = false;
    }
  }

  private async sendMessageWithRetry(messageData: any, attempt = 1): Promise<any> {
    try {
      const response = await this.api.sendChatMessage(messageData.toUserName, messageData.message).toPromise();

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      return response;
    } catch (error: any) {
      if (attempt < this.maxRetries && (error.status === 500 || error.status === 0 || !error.status)) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        return this.sendMessageWithRetry(messageData, attempt + 1);
      }
      throw error;
    }
  }

  getUserDisplayName(message: ChatMessage): string {
    if (typeof message.fromUserId === 'string') {
      return message.fromUserId === this.userId ? 'You' : this.targetUserName;
    } else if (message.fromUserId?.name) {
      return message.fromUserId._id === this.userId ? 'You' : message.fromUserId.name;
    }
    return 'Unknown';
  }

  isMyMessage(message: ChatMessage): boolean {
    return (
      message.fromUserId === this.userId ||
      (typeof message.fromUserId === 'object' && message.fromUserId._id === this.userId)
    );
  }
}

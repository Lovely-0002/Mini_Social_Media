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

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Conversation {
  userId: string;
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
  targetUserId = '';
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
    // Get the logged-in user profile
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
    // Connect socket.io with cookies and userId
    this.socket = io('http://localhost:5000', {
      query: { userId: this.userId },
      withCredentials: true,
      timeout: 10000, // 10 second timeout
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

    // Listen for incoming messages
    this.socket.on('private_message', (msg: ChatMessage) => {
      console.log('📨 Received message:', msg);
      
      // Only add message if it's part of current conversation
      if ((msg.fromUserId === this.targetUserId && msg.toUserId === this.userId) ||
          (msg.fromUserId === this.userId && msg.toUserId === this.targetUserId)) {
        
        // Avoid duplicates - check if message already exists
        const exists = this.messages.find(m => 
          m._id === msg._id || 
          (m.tempId && m.message === msg.message && Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 5000)
        );
        
        if (!exists) {
          this.messages.push(msg);
        }
      }
      // Update conversations list
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
    this.api.getChatConversations().subscribe({
      next: (data: any) => {
        this.conversations = data.conversations || [];
      },
      error: (err) => {
        console.error('❌ Failed to load conversations:', err);
      }
    });
  }

  selectConversation(userId: string) {
    this.targetUserId = userId;
    this.messages = [];
    this.error = '';
    this.loadChatHistory();
  }

  loadChatHistory() {
    if (!this.targetUserId) return;

    this.isLoading = true;
    this.api.getChatHistory(this.targetUserId).subscribe({
      next: (data: any) => {
        this.messages = data.messages || [];
        this.isLoading = false;
        console.log(`✅ Loaded ${this.messages.length} messages from ${data.source}`);
      },
      error: (err) => {
        this.error = 'Failed to load chat history';
        console.error('❌ Chat history error:', err);
        this.isLoading = false;
      }
    });
  }

  async sendMessage() {
    if (!this.messageText.trim() || !this.targetUserId || this.isSending) {
      if (!this.targetUserId) {
        this.error = 'Please select a user to chat with';
      }
      if (!this.messageText.trim()) {
        this.error = 'Please enter a message';
      }
      return;
    }

    // Check connection status
    if (!navigator.onLine) {
      this.error = 'You are offline. Please check your connection.';
      return;
    }

    const messageData = {
      toUserId: this.targetUserId,
      message: this.messageText.trim()
    };

    // Create temporary message for optimistic update
    const tempMessage: ChatMessage = {
      tempId: Date.now().toString(),
      fromUserId: this.userId,
      toUserId: this.targetUserId,
      message: messageData.message,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    // Add message to UI immediately
    this.messages.push(tempMessage);
    const originalMessage = this.messageText;
    this.messageText = '';
    this.isSending = true;
    this.error = '';

    try {
      // Send via HTTP API with retry logic
      const response = await this.sendMessageWithRetry(messageData);
      
      // Update temp message with real data
      const index = this.messages.findIndex(m => m.tempId === tempMessage.tempId);
      if (index !== -1) {
        this.messages[index] = {
          ...response.data,
          status: 'sent'
        };
      }

      // Send real-time notification via socket
      if (this.socket && this.isConnected) {
        this.socket.emit('private_message', messageData);
      }

      console.log('✅ Message sent successfully');

    } catch (error: any) {
      console.error('❌ Send message error:', error);
      
      // Update temp message status to failed
      const index = this.messages.findIndex(m => m.tempId === tempMessage.tempId);
      if (index !== -1) {
        this.messages[index].status = 'failed';
      }

      // Show error and restore message text for retry
      this.error = error.error?.error || 'Failed to send message. Click to retry.';
      this.messageText = originalMessage;
      
    } finally {
      this.isSending = false;
    }
  }

  private async sendMessageWithRetry(messageData: any, attempt = 1): Promise<any> {
    try {
      const response = await this.api.sendChatMessage(messageData.toUserId, messageData.message).toPromise();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
      
      return response;
      
    } catch (error: any) {
      console.error(`❌ Send attempt ${attempt} failed:`, error);
      
      if (attempt < this.maxRetries && 
          (error.status === 500 || error.status === 0 || !error.status)) {
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.sendMessageWithRetry(messageData, attempt + 1);
      }
      
      throw error;
    }
  }

  // Retry failed message
  retryMessage(message: ChatMessage) {
    if (message.status === 'failed') {
      this.messageText = message.message;
      this.sendMessage();
    }
  }

  // Remove failed message
  removeMessage(message: ChatMessage) {
    if (message.status === 'failed' || message.tempId) {
      const index = this.messages.indexOf(message);
      if (index > -1) {
        this.messages.splice(index, 1);
      }
    }
  }

  // Handle enter key press
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Clear error message
  clearError() {
    this.error = '';
  }

  // Helper method to get display name
  getUserDisplayName(message: ChatMessage): string {
    if (typeof message.fromUserId === 'string') {
      return message.fromUserId === this.userId ? 'You' : 'Friend';
    } else if (message.fromUserId && message.fromUserId.name) {
      return message.fromUserId === this.userId ? 'You' : message.fromUserId.name;
    }
    return message.fromUserId === this.userId ? 'You' : 'Friend';
  }

  // Get message status icon/text
  getMessageStatusText(message: ChatMessage): string {
    switch (message.status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'failed': return '❌';
      default: return '';
    }
  }

  // Check if message is from current user
  isMyMessage(message: ChatMessage): boolean {
    return message.fromUserId === this.userId || 
           (typeof message.fromUserId === 'object' && message.fromUserId._id === this.userId);
  }
}
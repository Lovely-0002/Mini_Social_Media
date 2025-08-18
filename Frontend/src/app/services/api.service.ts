// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  // === AUTH ===
  register(data: any) { return this.http.post(`${this.baseUrl}/auth/register`, data); }
  login(data: any) { return this.http.post(`${this.baseUrl}/auth/login`, data, { withCredentials: true }); }
  logout() { return this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true }); }  // Add this line
  getProfile() { return this.http.get(`${this.baseUrl}/auth/me`, { withCredentials: true }); }
  // === POSTS ===
  getFeed() { return this.http.get(`${this.baseUrl}/posts/feed`); }
  createPost(data: any) { return this.http.post(`${this.baseUrl}/posts/post`, data, { withCredentials: true }); }
  likePost(id: string) { return this.http.post(`${this.baseUrl}/posts/${id}/like`, {}, { withCredentials: true }); }
  commentPost(id: string, text: string) { return this.http.post(`${this.baseUrl}/posts/${id}/comment`, { text }, { withCredentials: true }); }

  // === FRIENDS ===
  sendFriendRequest(id: string) { return this.http.post(`${this.baseUrl}/friends/request/${id}`, {}, { withCredentials: true }); }
  getFriends(id: string) { return this.http.get(`${this.baseUrl}/friends/list/${id}`); }
  acceptFriendRequest(id: string) { return this.http.post(`${this.baseUrl}/friends/accept/${id}`, {}, { withCredentials: true }); }
  rejectFriendRequest(id: string) { return this.http.post(`${this.baseUrl}/friends/reject/${id}`, {}, { withCredentials: true }); }
  getAllUsers() { 
  return this.http.get(`${this.baseUrl}/auth/all`, { withCredentials: true });
  }

  // Get pending friend requests (backend should have a route like GET /friends/pending)
  getPendingRequests() {
  return this.http.get(`${this.baseUrl}/friends/pending`, { withCredentials: true });
  }

  // === CHAT ===
  // Send a chat message
  sendChatMessage(toUserId: string, message: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat/send`, {
      toUserId,
      message
    }, { withCredentials: true });
  }

  // Get chat history with a specific user
  getChatHistory(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/chat/history/${userId}`, {
      withCredentials: true
    });
  }

  // Get list of conversations
  getChatConversations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/chat/conversations`, {
      withCredentials: true
    });
  }

  // === AI ===
  chat(messages: { role: string, content: string }[]) {
    return this.http.post<{ reply: string }>(`${this.baseUrl}/ai/chat-ai`, { messages });
  }

  generateCaption(mood: string, keywords: string) {
    return this.http.post<{ caption: string }>(`${this.baseUrl}/ai/generate-caption`, { mood, keywords });
  }
}
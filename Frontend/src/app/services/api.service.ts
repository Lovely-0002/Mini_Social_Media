import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Comment {
  _id: string;
  user: { name: string; profilePicture: string };
  text: string;
  createdAt: string;
  parentCommentId?: string | null;  // Nested comment support
}

export interface Post {
  _id: string;
  userId: { name: string; email?: string; profilePicture: string };
  content: string;
  likeCount: number;
  comments: Comment[];
  createdAt: string;
  image?: string;
  hasLiked?: boolean;                // If current user liked
  commentPreview?: Comment[];        // Partial comments for preview
  totalComments?: number;            // Total number of comments
  likePreview?: { name: string; profilePicture: string }[];  // Liker previews
}

export interface FeedResponse {
  posts: Post[];
  currentPage: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    console.error('API call failed:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }

  // POSTS

  getFeed(page: number = 1, limit: number = 10): Observable<FeedResponse> {
    return this.http.get<FeedResponse>(
      `${this.baseUrl}/posts/feed?page=${page}&limit=${limit}`,
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  createPost(data: { content: string; image?: string }): Observable<Post> {
    return this.http.post<Post>(
      `${this.baseUrl}/posts/post`,
      data,
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  likePost(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/posts/${id}/like`,
      {},
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  unlikePost(id: string): Observable<{ message: string }> {
  return this.http.delete<{ message: string }>(
    `${this.baseUrl}/posts/${id}/like`,
    { withCredentials: true }
  ).pipe(catchError(this.handleError));
  }


  commentPost(postId: string, text: string, parentCommentId: string | null = null): Observable<{ message: string }> {
    const body: any = { text };
    if (parentCommentId) {
      body.parentCommentId = parentCommentId;
    }
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/posts/${postId}/comment`,
      body,
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  getAllComments(postId: string): Observable<{ comments: Comment[] }> {
    return this.http.get<{ comments: Comment[] }>(
      `${this.baseUrl}/posts/${postId}/comments`,
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  // AUTH

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data)
      .pipe(catchError(this.handleError));
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, data, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/me`, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  // FRIENDS

  sendFriendRequest(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/friends/request/${id}`, {}, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  getFriends(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/friends/list/${id}`)
      .pipe(catchError(this.handleError));
  }

  acceptFriendRequest(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/friends/accept/${id}`, {}, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  rejectFriendRequest(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/friends/reject/${id}`, {}, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/all`, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  getPendingRequests(): Observable<any> {
    return this.http.get(`${this.baseUrl}/friends/pending`, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  // CHAT

// CHAT (username-based)
sendChatMessage(toUserName: string, message: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/chat/send`, { toUserName, message }, {
    withCredentials: true
  }).pipe(catchError(this.handleError));
}

// Get chat history with a specific user (by username)
getChatHistory(userName: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/chat/history/by-name/${userName}`, {
    withCredentials: true
  }).pipe(catchError(this.handleError));
}
// Get list of conversations
getConversations(): Observable<any> {
  return this.http.get(`${this.baseUrl}/chat/conversations`, {
    withCredentials: true
  }).pipe(catchError(this.handleError));
}




  // AI

  chat(messages: { role: string; content: string }[]): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(`${this.baseUrl}/ai/chat-ai`, { messages })
      .pipe(catchError(this.handleError));
  }

  generateCaption(mood: string, keywords: string): Observable<{ caption: string }> {
    return this.http.post<{ caption: string }>(`${this.baseUrl}/ai/generate-caption`, { mood, keywords })
      .pipe(catchError(this.handleError));
  }

  // USER PROFILE

getUserProfile(userId: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/users/${userId}`, {
    withCredentials: true
  }).pipe(catchError(this.handleError));
}

updateUserProfile(userId: string, data: any): Observable<any> {
  return this.http.put(`${this.baseUrl}/users/${userId}`, data, {
    withCredentials: true
  }).pipe(catchError(this.handleError));
}

uploadAvatar(userId: string, file: File): Observable<any> {
  const formData = new FormData();
  formData.append('avatar', file);
  return this.http.post(`${this.baseUrl}/users/${userId}/avatar`, formData, {
    withCredentials: true
  }).pipe(catchError(this.handleError));
}
}
// src/app/services/ai.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = 'http://localhost:5000/ai'; // Backend base URL

  constructor(private http: HttpClient) {}

  chat(messages: { role: string, content: string }[]): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(`${this.apiUrl}/chat-ai`, { messages });
  }

  generateCaption(mood: string, keywords: string): Observable<{ caption: string }> {
    return this.http.post<{ caption: string }>(`${this.apiUrl}/generate-caption`, { mood, keywords });
  }
}

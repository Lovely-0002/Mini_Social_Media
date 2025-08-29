import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { FeedComponent } from './feed/feed.component';
import { FriendsComponent } from './friends/friends.component';
import { ChatComponent } from './chat/chat.component';
import { AiChatComponent } from './chat/ai-chat.component';
import { CaptionComponent } from './chat/caption.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'feed', component: FeedComponent },
  { path: 'friends', component: FriendsComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'ai-chat', component: AiChatComponent },
  { path: 'caption', component: CaptionComponent },
  { path: 'profile', component: ProfileComponent },   
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];

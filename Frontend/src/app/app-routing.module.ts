import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { FeedComponent } from './feed/feed.component';
import { FriendsComponent } from './friends/friends.component';
import { ChatComponent } from './chat/chat.component';
import { AiChatComponent } from './chat/ai-chat.component';
import { CaptionComponent } from './chat/caption.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'feed', component: FeedComponent },
  { path: 'friends', component: FriendsComponent },
  { path: 'chat', component: ChatComponent },       // Friend-to-friend chat
  { path: 'ai-chat', component: AiChatComponent },  // New AI chatbot
  { path: 'caption', component: CaptionComponent }, // New caption generator
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

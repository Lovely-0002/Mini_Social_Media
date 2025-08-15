import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; // Needed for [(ngModel)]
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ChatComponent } from './chat/chat.component';
import { AiChatComponent } from './chat/ai-chat.component';
import { CaptionComponent } from './chat/caption.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    AppComponent,
    ChatComponent,    // Import standalone components here
    AiChatComponent,
    CaptionComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

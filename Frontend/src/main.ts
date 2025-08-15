import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component'; // Change this line

bootstrapApplication(AppComponent, appConfig) // And this line
  .catch((err) => console.error(err));
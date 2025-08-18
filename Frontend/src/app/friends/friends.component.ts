import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friends.component.html'
})
export class FriendsComponent implements OnInit {
  friends: any[] = [];
  userId: string = ''; // Will be set after profile loads

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.api.getProfile().subscribe((profile: any) => {
      this.userId = profile._id;      // Assumes user ID is returned here
      this.loadFriends();
    });
  }

  loadFriends() {
    if (!this.userId) return;
    this.api.getFriends(this.userId).subscribe((res: any) => {
      this.friends = res;
    });
  }
}

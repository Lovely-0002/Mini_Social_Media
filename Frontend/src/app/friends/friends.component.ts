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

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProfile().subscribe((u: any) => {
      this.api.getFriends(u._id).subscribe((data: any) => this.friends = data);
    });
  }
}

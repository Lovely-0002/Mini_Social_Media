import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html'
})
export class FeedComponent implements OnInit {
  posts: any[] = [];
  content = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadFeed();
  }

  loadFeed() {
    this.api.getFeed().subscribe((data: any) => this.posts = data);
  }

  createPost() {
    if (!this.content) return;
    this.api.createPost({ content: this.content }).subscribe(() => {
      this.content = '';
      this.loadFeed();
    });
  }

  // Rename to like() as called in template
  like(post: any) {
    this.api.likePost(post._id).subscribe(() => this.loadFeed());
  }
}

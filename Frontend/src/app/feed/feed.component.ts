import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Post, FeedResponse, Comment } from '../services/api.service';
import { HttpErrorResponse } from '@angular/common/http';

interface CommentTree extends Comment {
  replies?: CommentTree[];
  postId?: string;
}

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html'
})
export class FeedComponent implements OnInit {
  posts: Post[] = [];
  commentTrees: { [postId: string]: CommentTree[] } = {};
  content = '';
  currentPage = 1;
  totalPages = 1;
  limit = 10;
  loading = false;
  creatingPost = false;
  commentTexts: { [key: string]: string } = {};
  openReplyBoxes: { [commentId: string]: boolean } = {};
  showAllComments: { [postId: string]: boolean } = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadFeed();
  }

  loadFeed(page: number = this.currentPage) {
    this.loading = true;
    this.api.getFeed(page, this.limit).subscribe({
      next: (data: FeedResponse) => {
        this.posts = data.posts;
        this.currentPage = data.currentPage;
        this.totalPages = data.totalPages;
        this.loading = false;
        this.showAllComments = {};
        this.commentTrees = {};
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading feed:', error);
        alert('Failed to load feed: ' + (error.message || 'Unknown error'));
        this.posts = [];
        this.totalPages = 1;
        this.currentPage = 1;
        this.loading = false;
      }
    });
  }

  createPost() {
    if (!this.content.trim()) return;
    this.creatingPost = true;
    this.api.createPost({ content: this.content.trim() }).subscribe({
      next: () => {
        this.content = '';
        this.loadFeed(1);
        this.creatingPost = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error creating post:', error);
        alert('Failed to create post: ' + (error.message || 'Unknown error'));
        this.creatingPost = false;
      }
    });
  }

  like(post: Post) {
    if (post.hasLiked) {
      this.api.unlikePost(post._id).subscribe({
        next: () => this.loadFeed(this.currentPage),
        error: (error) => {
          console.error('Failed to unlike post:', error);
          alert('Failed to unlike post');
        }
      });
    } else {
      this.api.likePost(post._id).subscribe({
        next: () => this.loadFeed(this.currentPage),
        error: (error) => {
          console.error('Failed to like post:', error);
          alert('Failed to like post');
        }
      });
    }
  }

  submitComment(postId: string, parentCommentId: string | null = null) {
    const key = parentCommentId || postId;
    const text = (this.commentTexts[key] || '').trim();
    if (!text) return;
    this.api.commentPost(postId, text, parentCommentId).subscribe({
      next: () => {
        this.commentTexts[key] = '';
        if (parentCommentId) {
          this.openReplyBoxes[parentCommentId] = false;
        }
        this.loadFeed(this.currentPage);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error submitting comment:', error);
        alert('Failed to submit comment: ' + (error.message || 'Unknown error'));
      }
    });
  }

  loadAllComments(postId: string) {
    this.api.getAllComments(postId).subscribe({
      next: (data: { comments: Comment[] }) => {
        this.commentTrees[postId] = this.buildCommentTree(data.comments, postId);
        this.showAllComments[postId] = true;
      },
      error: (error: HttpErrorResponse) => {
        alert('Failed to load all comments: ' + (error.message || 'Unknown error'));
      }
    });
  }

  buildCommentTree(comments: Comment[], postId?: string): CommentTree[] {
    const map: { [id: string]: CommentTree } = {};
    const roots: CommentTree[] = [];
    comments.forEach(c => (map[c._id] = { ...c, replies: [], postId }));
    comments.forEach(c => {
      if (c.parentCommentId && map[c.parentCommentId]) {
        map[c.parentCommentId].replies!.push(map[c._id]);
      } else {
        roots.push(map[c._id]);
      }
    });
    return roots;
  }

  toggleReplyBox(commentId: string) {
    this.openReplyBoxes[commentId] = !this.openReplyBoxes[commentId];
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.loadFeed(page);
    }
  }

  trackByPostId(index: number, post: Post): string {
    return post._id;
  }

  trackByCommentId(index: number, comment: Comment): string {
    return comment._id;
  }
}

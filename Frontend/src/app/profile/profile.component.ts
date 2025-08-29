import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

interface UserProfile {
  _id?: string;
  name: string;
  bio?: string;
  avatar?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: UserProfile = { name: '' };
  editMode = false;
  selectedFile: File | null = null;
  loading = false;
  debugInfo = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadProfile();
  }

  // fetch profile
  loadProfile() {
    const userId = localStorage.getItem('userId');
    this.debugInfo = `🔍 Loading profile for userId: ${userId}`;
    console.log(this.debugInfo);
    
    if (!userId) {
      this.debugInfo = '❌ No userId found in localStorage. Please login again.';
      console.error(this.debugInfo);
      alert(this.debugInfo);
      return;
    }

    this.api.getUserProfile(userId).subscribe({
      next: (res) => {
        this.debugInfo = `✅ Profile loaded successfully`;
        console.log('📌 Profile API Response:', res);
        this.user = res.user ? res.user : res;
        console.log('👤 User data:', this.user);
      },
      error: (err) => {
        this.debugInfo = `❌ Failed to load profile: ${err.message}`;
        console.error('Load profile error:', err);
        alert('Failed to load profile. Check console for details.');
      }
    });
  }

  toggleEdit() {
    this.editMode = !this.editMode;
    this.debugInfo = `🔄 Edit mode: ${this.editMode}`;
    console.log(this.debugInfo);
  }

  saveProfile() {
    const userId = localStorage.getItem('userId');
    
    // Validation
    if (!userId) {
      this.debugInfo = '❌ No userId found in localStorage';
      console.error(this.debugInfo);
      alert('Please login again.');
      return;
    }

    if (!this.user.name || this.user.name.trim().length < 2) {
      this.debugInfo = '❌ Name must be at least 2 characters';
      console.error(this.debugInfo);
      alert('Name must be at least 2 characters long.');
      return;
    }

    // Prepare data
    const profileData = {
      name: this.user.name.trim(),
      bio: this.user.bio?.trim() || ''
    };

    this.debugInfo = `💾 Saving profile for userId: ${userId}`;
    console.log(this.debugInfo);
    console.log('📝 Profile data:', profileData);
    
    this.loading = true;

    this.api.updateUserProfile(userId, profileData).subscribe({
      next: (res) => {
        this.debugInfo = '✅ Profile updated successfully!';
        console.log(this.debugInfo);
        console.log('Updated user data:', res);
        
        this.user = res;
        this.editMode = false;
        this.loading = false;
        alert('Profile updated successfully!');
      },
      error: (err) => {
        this.debugInfo = `❌ Failed to update profile: ${err.message}`;
        console.error('Save profile error:', err);
        console.error('Error details:', err.error);
        
        this.loading = false;
        
        // Show detailed error message
        let errorMsg = 'Failed to update profile';
        if (err.error?.error) {
          errorMsg += ': ' + err.error.error;
        } else if (err.message) {
          errorMsg += ': ' + err.message;
        }
        alert(errorMsg);
      }
    });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    const userId = localStorage.getItem('userId');
    
    if (!this.selectedFile) {
      console.log('❌ No file selected');
      return;
    }

    if (!userId) {
      console.error('❌ No userId for avatar upload');
      alert('Please login again.');
      return;
    }

    console.log('📸 File selected:', {
      name: this.selectedFile.name,
      size: this.selectedFile.size,
      type: this.selectedFile.type
    });

    this.api.uploadAvatar(userId, this.selectedFile).subscribe({
      next: (res) => {
        console.log('✅ Avatar uploaded successfully:', res);
        this.user = res;
        alert('Avatar updated successfully!');
      },
      error: (err) => {
        console.error('❌ Failed to upload avatar:', err);
        alert('Failed to upload avatar: ' + (err.error?.error || err.message));
      }
    });
  }

  // Test method to check if backend is reachable
  testConnection() {
    console.log('🔍 Testing backend connection...');
    this.api.getUserProfile('test').subscribe({
      next: (res) => console.log('✅ Backend reachable:', res),
      error: (err) => console.log('❌ Backend error:', err)
    });
  }
}
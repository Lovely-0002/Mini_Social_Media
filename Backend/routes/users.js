const express = require('express');
const router = express.Router();
const User = require('../models/User');
const upload = require('../middleware/upload');
const path = require('path');

// ==================== 
// Get user profile
// ==================== 
router.get('/:id', async (req, res) => {
  try {
    console.log('📌 GET /users/:id - Requested ID:', req.params.id);
    
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      console.log('❌ User not found:', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', { id: user._id, name: user.name });
    res.json(user);
  } catch (err) {
    console.error('❌ Error in GET /users/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 
// Update profile
// ==================== 
router.put('/:id', async (req, res) => {
  try {
    console.log('📌 PUT /users/:id - Requested ID:', req.params.id);
    console.log('📝 Request body:', req.body);
    
    const allowedUpdates = ['name', 'bio']; 
    const updateData = {};

    // Validate and prepare update data
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    console.log('🔄 Update data prepared:', updateData);

    // Validate name if provided
    if (updateData.name) {
      if (updateData.name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters long' });
      }
      if (updateData.name.trim().length > 20) {
        return res.status(400).json({ error: 'Name cannot exceed 20 characters' });
      }
    }

    // Validate bio if provided
    if (updateData.bio && updateData.bio.length > 500) {
      return res.status(400).json({ error: 'Bio cannot exceed 500 characters' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      console.log('❌ User not found for update:', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User updated successfully:', { id: updatedUser._id, name: updatedUser.name });
    res.json(updatedUser);
  } catch (err) {
    console.error('❌ Error in PUT /users/:id:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ==================== 
// Upload avatar
// ==================== 
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    console.log('📌 POST /users/:id/avatar - Requested ID:', req.params.id);
    console.log('📸 File info:', req.file ? { filename: req.file.filename, size: req.file.size } : 'No file');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: `/uploads/${req.file.filename}` },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      console.log('❌ User not found for avatar update:', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Avatar updated successfully:', { id: updatedUser._id, avatar: updatedUser.avatar });
    res.json(updatedUser);
  } catch (err) {
    console.error('❌ Error in POST /users/:id/avatar:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
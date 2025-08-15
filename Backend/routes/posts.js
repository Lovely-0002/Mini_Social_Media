const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Impression = require('../models/Impression');
const authMiddleware = require('../middleware/authMiddleware');

// Create Post
router.post('/post', authMiddleware, async (req, res) => {
  try {
    const { content, image } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const newPost = await Post.create({
      userId: req.userId,
      content,
      image
    });

    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Server error while creating post' });
  }
});

// Like a Post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const alreadyLiked = await Impression.findOne({ postId, userId, type: 'like' });
    if (alreadyLiked) return res.status(400).json({ error: 'Already liked' });

    await Impression.create({ postId, userId, type: 'like' });
    res.json({ message: 'Post liked successfully' });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comment on a Post
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: 'Comment text is required' });

    await Impression.create({ postId, userId, type: 'comment', commentText: text });
    res.json({ message: 'Comment added successfully' });
  } catch (err) {
    console.error('Error commenting on post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch Feed
router.get('/feed', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('userId', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error('Error fetching feed:', err);
    res.status(500).json({ error: 'Server error while fetching feed' });
  }
});

module.exports = router;

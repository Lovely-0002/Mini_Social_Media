const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Impression = require('../models/Impression');
const User = require('../models/User'); // needed for populating like/comment user info
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
// Unlike a Post
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const deleted = await Impression.findOneAndDelete({ postId, userId, type: 'like' });
    
    if (!deleted) return res.status(400).json({ error: 'Like not found' });

    res.json({ message: 'Post unliked successfully' });
  } catch (err) {
    console.error('Error unliking post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Comment or reply
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const { text, parentCommentId = null } = req.body;

    if (!text) return res.status(400).json({ error: 'Comment text is required' });

    const newComment = await Impression.create({
      postId,
      userId,
      type: 'comment',
      commentText: text,
      parentCommentId
    });

    res.status(201).json({ message: 'Comment added', comment: newComment });
  } catch (err) {
    console.error('Error commenting on post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch Feed
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // current logged in user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get paginated posts
    const posts = await Post.find()
      .populate('userId', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get postIds
    const postIds = posts.map(p => p._id);

    // Likes and Like Preview (last two likers)
    const likes = await Impression.find({ type: 'like', postId: { $in: postIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'name profilePicture')
      .lean();

    const likesMap = {};
    const likePreviewMap = {};
    const userLikedSet = new Set();

    likes.forEach(like => {
      const pid = like.postId.toString();
      if (!likesMap[pid]) likesMap[pid] = 0;
      likesMap[pid]++;
      // Like preview: keep up to 2 most recent
      if (!likePreviewMap[pid]) likePreviewMap[pid] = [];
      if (likePreviewMap[pid].length < 2) likePreviewMap[pid].push(like.userId);
      // Current user liked?
      if (like.userId && like.userId._id.toString() === userId.toString()) userLikedSet.add(pid);
    });

    // Comments and Comment Preview (latest 2)
    const comments = await Impression.find({
      type: 'comment',
      postId: { $in: postIds }
    })
      .populate('userId', 'name profilePicture')
      .sort({ createdAt: 1 }) // oldest first
      .lean();

    // Organize comments for tree building and extract latest 2 for preview
    const commentsMap = {};      // For all comments for tree rendering in frontend
    const commentPreviewMap = {}; // For only latest 2 preview

    comments.forEach(cmt => {
      const pid = cmt.postId.toString();
      if (!commentsMap[pid]) commentsMap[pid] = [];
      commentsMap[pid].push({
        _id: cmt._id,
        user: cmt.userId,
        text: cmt.commentText,
        createdAt: cmt.createdAt,
        parentCommentId: cmt.parentCommentId || null
      });
    });

    // Preview: Get last 2 (newest) comments per post
    Object.entries(commentsMap).forEach(([pid, arr]) => {
      commentPreviewMap[pid] = arr.slice(-2); // last two
    });

    // Attach likes, likePreviews, hasLiked, commentPreviews to each post
    posts.forEach(post => {
      const pid = post._id.toString();
      post.likeCount = likesMap[pid] || 0;
      post.likePreview = likePreviewMap[pid] || [];
      post.hasLiked = userLikedSet.has(pid);
      post.totalComments = commentsMap[pid]?.length || 0;
      post.commentPreview = commentPreviewMap[pid] || [];
      // Optional: Attach all comments for detailed view if needed (for "See All")
      // post.comments = commentsMap[pid] || [];
    });

    const totalPosts = await Post.countDocuments();

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit)
    });
  } catch (err) {
    console.error('Error fetching feed:', err);
    res.status(500).json({ error: 'Server error while fetching feed' });
  }
});

// Endpoint for fetching full comments of a post (for "See All" button)
router.get('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await Impression.find({ type: 'comment', postId })
      .populate('userId', 'name profilePicture')
      .sort({ createdAt: 1 })
      .lean();

    // Send all comments for tree building
    const result = comments.map(cmt => ({
      _id: cmt._id,
      user: cmt.userId,
      text: cmt.commentText,
      createdAt: cmt.createdAt,
      parentCommentId: cmt.parentCommentId || null
    }));

    res.json({ comments: result });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching post comments' });
  }
});

module.exports = router;

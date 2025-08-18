// backend/routes/friends.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const authMiddleware = require('../middleware/authMiddleware');

// =============================
// Get all users (for friend system)
// =============================
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Get all users except the current logged-in one
    const users = await User.find({}, 'name email'); // keep only public fields
    res.json(users.filter(u => u._id.toString() !== req.userId));
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================
// Send friend request
// =============================
router.post('/request/:userId', authMiddleware, async (req, res) => {
  try {
    const fromUserId = req.userId;
    const toUserId = req.params.userId;

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: "Can't send request to yourself" });
    }

    const target = await User.findById(toUserId);
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    // Check if request or friendship already exists
    const exists = await Friendship.findOne({
      from: fromUserId,
      to: toUserId,
      status: { $in: ['pending', 'accepted'] }
    });
    if (exists) return res.status(400).json({ error: 'Friend request already sent or already friends' });

    await Friendship.create({ from: fromUserId, to: toUserId });
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Error sending request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================
// Accept friend request
// =============================
router.post('/accept/:fromUserId', authMiddleware, async (req, res) => {
  try {
    const toUserId = req.userId;
    const fromUserId = req.params.fromUserId;

    const request = await Friendship.findOneAndUpdate(
      { from: fromUserId, to: toUserId, status: 'pending' },
      { status: 'accepted' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found or already handled' });
    }

    res.json({ message: 'Friend request accepted', request });
  } catch (err) {
    console.error('Error accepting request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================
// Reject friend request
// =============================
router.post('/reject/:fromUserId', authMiddleware, async (req, res) => {
  try {
    const toUserId = req.userId;
    const fromUserId = req.params.fromUserId;

    const request = await Friendship.findOneAndUpdate(
      { from: fromUserId, to: toUserId, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found or already handled' });
    }

    res.json({ message: 'Friend request rejected', request });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================
// List accepted friends
// =============================
router.get('/list/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const friendships = await Friendship.find({
      $or: [{ from: userId }, { to: userId }],
      status: 'accepted'
    }).populate('from to', 'name email');

    const friends = friendships.map(f =>
      f.from._id.toString() === userId ? f.to : f.from
    );

    res.json(friends);
  } catch (err) {
    console.error('Error listing friends:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================
// List pending friend requests
// =============================
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const toUserId = req.userId;

    const requests = await Friendship.find({ to: toUserId, status: 'pending' })
      .populate('from', 'name email');

    res.json(requests);
  } catch (err) {
    console.error('Error fetching pending requests:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

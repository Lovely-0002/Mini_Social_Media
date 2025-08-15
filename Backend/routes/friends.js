const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const authMiddleware = require('../middleware/authMiddleware');

// Send friend request
router.post('/request/:userId', authMiddleware, async (req, res) => {
  try {
    const fromUserId = req.userId;
    const toUserId = req.params.userId;

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: "Can't send request to yourself" });
    }

    const target = await User.findById(toUserId);
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    // Check if a request already exists
    const exists = await Friendship.findOne({
      from: fromUserId,
      to: toUserId,
      status: 'pending'
    });
    if (exists) return res.status(400).json({ error: 'Friend request already sent' });

    await Friendship.create({ from: fromUserId, to: toUserId });
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List friends
router.get('/list/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find all friendships where the user is either sender or receiver and status is accepted
    const friendships = await Friendship.find({
      $or: [{ from: userId }, { to: userId }],
      status: 'accepted'
    }).populate('from to', 'name email avatar');

    // Extract the other user in each friendship
    const friends = friendships.map(f =>
      f.from._id.toString() === userId ? f.to : f.from
    );

    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept friend request
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject friend request
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
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { client: redisClient } = require('../redisClient');
const authMiddleware = require('../middleware/authMiddleware');

// Send message to targeted user
router.post('/send', authMiddleware, async (req, res) => {
  const { toUserId, message } = req.body;
  const fromUserId = req.userId; // From auth middleware
  
  try {
    if (!toUserId || !message) {
      return res.status(400).json({ error: 'toUserId and message are required' });
    }

    // Save to database
    const chatMessage = new ChatMessage({
      fromUserId,
      toUserId,
      message,
      timestamp: new Date()
    });
    
    await chatMessage.save();
    
    // Cache in Redis for both users
    const redisKey1 = `chat:${fromUserId}:${toUserId}`;
    const redisKey2 = `chat:${toUserId}:${fromUserId}`;
    
    const messageData = JSON.stringify(chatMessage);
    const timestamp = Date.now();
    
    await redisClient.zAdd(redisKey1, timestamp, messageData);
    await redisClient.zAdd(redisKey2, timestamp, messageData);
    
    res.json({ 
      success: true, 
      message: 'Message sent successfully',
      data: chatMessage 
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all chat history for current user
router.get('/history/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
  
  try {
    // Get all conversations involving current user and specified user
    const messages = await ChatMessage.find({
      $or: [
        { fromUserId: currentUserId, toUserId: userId },
        { fromUserId: userId, toUserId: currentUserId }
      ]
    })
    .populate('fromUserId', 'name email')
    .populate('toUserId', 'name email')
    .sort({ timestamp: 1 }) // Oldest first
    .limit(100);
    
    res.json({ source: 'mongodb', messages });
  } catch (err) {
    console.error('Error fetching user history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});



// Get list of users who have chatted with current user
router.get('/conversations', authMiddleware, async (req, res) => {
  const currentUserId = req.userId;
  
  try {
    // Get unique conversation partners
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: new mongoose.Types.ObjectId(currentUserId) },
            { toUserId: new mongoose.Types.ObjectId(currentUserId) }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$fromUserId', new mongoose.Types.ObjectId(currentUserId)] },
              '$toUserId',
              '$fromUserId'
            ]
          },
          lastMessage: { $last: '$message' },
          lastMessageTime: { $last: '$timestamp' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          lastMessage: 1,
          lastMessageTime: 1
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);
    
    res.json({ conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
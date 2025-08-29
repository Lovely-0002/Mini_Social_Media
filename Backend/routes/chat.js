const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { client: redisClient } = require('../redisClient');
const authMiddleware = require('../middleware/authMiddleware');

// Send message to targeted user
router.post('/send', authMiddleware, async (req, res) => {
  const { toUserName, message } = req.body;
  const fromUserId = req.userId;

  try {
    if (!toUserName || !message) {
      return res.status(400).json({ error: 'toUserName and message are required' });
    }

    // Find recipient by name
    const User = mongoose.model('User'); 
    const recipient = await User.findOne({ name: toUserName });
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    const toUserId = recipient._id;

    // Save to database
    const chatMessage = new ChatMessage({
      fromUserId,
      toUserId,
      message,
      timestamp: new Date()
    });
    const savedMessage = await chatMessage.save();

    // Emit via Socket.IO
    if (req.socketHandler) {
      req.socketHandler.sendToUser(toUserId.toString(), 'private_message', {
        _id: savedMessage._id,
        fromUserId,
        toUserId,
        message,
        timestamp: savedMessage.timestamp
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        _id: savedMessage._id,
        fromUserId,
        toUserId,
        message,
        timestamp: savedMessage.timestamp
      }
    });

  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ✅ Get chat history by userName (instead of userId)
router.get('/history/by-name/:userName', authMiddleware, async (req, res) => {
  const { userName } = req.params;
  const currentUserId = req.userId;

  try {
    const User = mongoose.model('User');
    const otherUser = await User.findOne({ name: userName });
    if (!otherUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const otherUserId = otherUser._id.toString();

    // First try Redis cache
    let messages = [];
    let source = 'mongodb';

    try {
      const redisKey = `chat:${currentUserId}:${otherUserId}`;
      const cachedMessages = await redisClient.zRange(redisKey, 0, 49, { REV: true });

      if (cachedMessages && cachedMessages.length > 0) {
        messages = cachedMessages.map(msg => JSON.parse(msg)).reverse();
        source = 'redis-cache';
        console.log(`✅ Loaded ${messages.length} messages from Redis cache`);
      }
    } catch (redisError) {
      console.warn('⚠️ Redis fetch error, fallback to MongoDB:', redisError.message);
    }

    // If no Redis cache, get from MongoDB
    if (messages.length === 0) {
      const dbMessages = await ChatMessage.find({
        $or: [
          { fromUserId: currentUserId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: currentUserId }
        ]
      })
        .populate('fromUserId', 'name email')
        .populate('toUserId', 'name email')
        .sort({ timestamp: 1 })
        .limit(100);

      messages = dbMessages;
      source = 'mongodb';
    }

    res.json({
      success: true,
      source,
      messages,
      count: messages.length,
      userOnline: req.socketHandler ? req.socketHandler.isUserOnline(otherUserId) : false
    });
  } catch (err) {
    console.error('❌ Error fetching history by name:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
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

    // Add online status to conversations
    const conversationsWithStatus = conversations.map(conv => ({
      ...conv,
      isOnline: req.socketHandler ? req.socketHandler.isUserOnline(conv.userId.toString()) : false
    }));
         
    res.json({ 
      success: true,
      conversations: conversationsWithStatus,
      totalOnlineUsers: req.socketHandler ? req.socketHandler.getOnlineUserCount() : 0
    });
  } catch (err) {
    console.error('❌ Error fetching conversations:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch conversations' 
    });
  }
});

// Get online users (useful for showing who's available to chat)
router.get('/online-users', authMiddleware, (req, res) => {
  try {
    if (!req.socketHandler) {
      return res.status(503).json({ 
        success: false,
        error: 'Socket service unavailable' 
      });
    }

    const onlineUsers = req.socketHandler.getOnlineUsers();
    const currentUserId = req.userId;
    
    // Remove current user from the list
    const otherOnlineUsers = onlineUsers.filter(userId => userId !== currentUserId);
    
    res.json({
      success: true,
      onlineUsers: otherOnlineUsers,
      count: otherOnlineUsers.length,
      total: onlineUsers.length
    });
  } catch (err) {
    console.error('❌ Error fetching online users:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch online users' 
    });
  }
});

// Mark messages as read (optional feature)
router.post('/mark-read/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
  
  try {
    // Update messages as read in database
    const result = await ChatMessage.updateMany(
      { 
        fromUserId: userId, 
        toUserId: currentUserId, 
        read: { $ne: true } 
      },
      { read: true, readAt: new Date() }
    );
    
    // Notify sender that messages were read via Socket.IO
    if (req.socketHandler && result.modifiedCount > 0) {
      req.socketHandler.sendToUser(userId, 'messages_read', {
        readBy: currentUserId,
        messageCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Messages marked as read',
      count: result.modifiedCount
    });
  } catch (err) {
    console.error('❌ Error marking messages as read:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark messages as read' 
    });
  }
});

module.exports = router;
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

    // Save to database first (primary storage)
    const chatMessage = new ChatMessage({
      fromUserId,
      toUserId,
      message,
      timestamp: new Date()
    });
         
    const savedMessage = await chatMessage.save();
         
    // Cache in Redis for both users - with proper error handling
    try {
      const redisKey1 = `chat:${fromUserId}:${toUserId}`;
      const redisKey2 = `chat:${toUserId}:${fromUserId}`;
      
      // Create a clean message object for Redis
      const messageForRedis = {
        _id: savedMessage._id.toString(),
        fromUserId: savedMessage.fromUserId.toString(),
        toUserId: savedMessage.toUserId.toString(),
        message: savedMessage.message,
        timestamp: savedMessage.timestamp.toISOString()
      };
      
      const messageData = JSON.stringify(messageForRedis);
      const timestamp = savedMessage.timestamp.getTime(); // Convert to milliseconds
      
      // Validate data before Redis operation
      if (timestamp && messageData && !isNaN(timestamp)) {
        await Promise.all([
          redisClient.zAdd(redisKey1, { score: timestamp, value: messageData }),
          redisClient.zAdd(redisKey2, { score: timestamp, value: messageData })
        ]);
        console.log('✅ Message cached in Redis');
      } else {
        console.warn('⚠️ Invalid Redis data, skipping cache:', { timestamp, messageDataLength: messageData?.length });
      }
    } catch (redisError) {
      console.warn('⚠️ Redis cache error (non-critical):', redisError.message);
      // Don't throw - message was saved to MongoDB successfully
    }

    // Send real-time notification via Socket.IO (if user is online)
    let realTimeDelivered = false;
    if (req.socketHandler) {
      const sent = req.socketHandler.sendToUser(toUserId, 'private_message', {
        _id: savedMessage._id,
        fromUserId,
        toUserId,
        message,
        timestamp: savedMessage.timestamp
      });
      
      realTimeDelivered = req.socketHandler.isUserOnline(toUserId);
      console.log(`Real-time message ${sent ? 'delivered' : 'queued'} for user ${toUserId}`);
    }
         
    // Always send success response
    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        _id: savedMessage._id,
        fromUserId: savedMessage.fromUserId,
        toUserId: savedMessage.toUserId,
        message: savedMessage.message,
        timestamp: savedMessage.timestamp
      },
      realTimeDelivered
    });

  } catch (err) {
    console.error('❌ Critical error sending message:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all chat history for current user
router.get('/history/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
     
  try {
    // First try Redis cache for recent messages
    let messages = [];
    let source = 'mongodb';
    
    try {
      const redisKey = `chat:${currentUserId}:${userId}`;
      const cachedMessages = await redisClient.zRange(redisKey, 0, 49, { REV: true }); // Last 50 messages
      
      if (cachedMessages && cachedMessages.length > 0) {
        messages = cachedMessages.map(msg => JSON.parse(msg)).reverse();
        source = 'redis-cache';
        console.log(`✅ Loaded ${messages.length} messages from Redis cache`);
      }
    } catch (redisError) {
      console.warn('⚠️ Redis fetch error, falling back to MongoDB:', redisError.message);
    }
    
    // If no Redis cache or error, get from MongoDB
    if (messages.length === 0) {
      const dbMessages = await ChatMessage.find({
        $or: [
          { fromUserId: currentUserId, toUserId: userId },
          { fromUserId: userId, toUserId: currentUserId }
        ]
      })
      .populate('fromUserId', 'name email')
      .populate('toUserId', 'name email')
      .sort({ timestamp: 1 }) // Oldest first
      .limit(100);
      
      messages = dbMessages;
      source = 'mongodb';
    }
         
    res.json({ 
      success: true,
      source, 
      messages,
      count: messages.length,
      userOnline: req.socketHandler ? req.socketHandler.isUserOnline(userId) : false
    });
  } catch (err) {
    console.error('❌ Error fetching user history:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch history' 
    });
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
// socketHandler.js
const ChatMessage = require('./models/ChatMessage');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.users = {}; // Keep track of online users
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.handshake.query.userId;
    
    if (userId) {
      this.users[userId] = socket.id;
      console.log(`User ${userId} connected with socket ${socket.id}`);
      
      // Notify user they're connected
      socket.emit('connected', { 
        userId, 
        message: 'Connected to chat server',
        onlineUsers: Object.keys(this.users).length
      });
    } else {
      console.log('User connected without userId');
    }

    // Set up event listeners for this socket
    this.setupSocketListeners(socket, userId);
  }

  setupSocketListeners(socket, userId) {
    // Handle private messages
    socket.on('private_message', (data) => {
      this.handlePrivateMessage(socket, userId, data);
    });

    // Handle user joining a specific chat room
    socket.on('join_chat', (data) => {
      this.handleJoinChat(socket, userId, data);
    });

    // Handle user leaving a specific chat room
    socket.on('leave_chat', (data) => {
      this.handleLeaveChat(socket, userId, data);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      this.handleTyping(socket, userId, data);
    });

    // Handle user disconnect
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, userId, reason);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      this.handleSocketError(socket, userId, error);
    });
  }

  async handlePrivateMessage(socket, fromUserId, data) {
    try {
      const { toUserId, message } = data;

      if (!toUserId || !message || !fromUserId) {
        socket.emit('error', { 
          type: 'validation_error',
          message: 'Missing required fields: toUserId, message' 
        });
        return;
      }

      console.log(`Private message from ${fromUserId} to ${toUserId}: ${message}`);

      // Create message object with timestamp
      const messageData = {
        fromUserId,
        toUserId,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      // Check if recipient is online
      const recipientSocketId = this.users[toUserId];
      
      if (recipientSocketId) {
        // Send to recipient if they're online
        this.io.to(recipientSocketId).emit('private_message', messageData);
        console.log(`Message delivered to online user ${toUserId}`);
      } else {
        console.log(`User ${toUserId} is offline - message will be delivered when they come online`);
      }

      // Send confirmation back to sender
      socket.emit('message_sent', {
        success: true,
        message: 'Message sent successfully',
        delivered: !!recipientSocketId,
        data: messageData
      });

    } catch (error) {
      console.error('Error handling private message:', error);
      socket.emit('error', { 
        type: 'message_error',
        message: 'Failed to send message',
        error: error.message 
      });
    }
  }

  handleJoinChat(socket, userId, data) {
    const { chatId } = data;
    if (chatId && userId) {
      socket.join(chatId);
      console.log(`User ${userId} joined chat room: ${chatId}`);
      
      // Notify others in the room
      socket.to(chatId).emit('user_joined', {
        userId,
        message: `User ${userId} joined the chat`
      });
    }
  }

  handleLeaveChat(socket, userId, data) {
    const { chatId } = data;
    if (chatId && userId) {
      socket.leave(chatId);
      console.log(`User ${userId} left chat room: ${chatId}`);
      
      // Notify others in the room
      socket.to(chatId).emit('user_left', {
        userId,
        message: `User ${userId} left the chat`
      });
    }
  }

  handleTyping(socket, fromUserId, data) {
    const { toUserId, isTyping } = data;
    const recipientSocketId = this.users[toUserId];
    
    if (recipientSocketId && fromUserId) {
      this.io.to(recipientSocketId).emit('user_typing', {
        fromUserId,
        isTyping,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleDisconnect(socket, userId, reason) {
    if (userId) {
      delete this.users[userId];
      console.log(`User ${userId} disconnected: ${reason}`);
      
      // Notify other users that this user went offline (optional)
      socket.broadcast.emit('user_offline', {
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleSocketError(socket, userId, error) {
    console.error(`Socket error for user ${userId}:`, error);
    socket.emit('error', {
      type: 'socket_error',
      message: 'Connection error occurred',
      error: error.message
    });
  }

  // Utility methods
  getUserSocketId(userId) {
    return this.users[userId];
  }

  isUserOnline(userId) {
    return userId in this.users;
  }

  getOnlineUsers() {
    return Object.keys(this.users);
  }

  getOnlineUserCount() {
    return Object.keys(this.users).length;
  }

  // Send message to specific user (can be called from routes)
  sendToUser(userId, event, data) {
    const socketId = this.users[userId];
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Broadcast to all connected users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

module.exports = SocketHandler;
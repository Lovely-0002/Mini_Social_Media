const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectRedis } = require('./redisClient');
const SocketHandler = require('./socketHandler');

// Import all route files
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const userRoutes = require('./routes/users');

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// CORS configuration - allow credentials for auth
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

app.use(express.json());
app.use(cookieParser());

// Serve static files (uploaded images) - IMPORTANT: This must be before routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📸 Static file serving enabled for /uploads');

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.IO handler
const socketHandler = new SocketHandler(io);

// Middleware to make socket handler accessible in routes
app.use((req, res, next) => {
  req.socketHandler = socketHandler;
  req.io = io;
  next();
});

// Register all routes
app.use('/chat', chatRoutes);
app.use('/ai', aiRoutes);
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/friends', friendRoutes);
app.use('/users', userRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    onlineUsers: req.socketHandler.getOnlineUserCount(),
    uploadsDir: fs.existsSync(uploadsDir) ? 'exists' : 'missing'
  });
});

// Connect DBs and start server
async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
    
    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📸 Uploads available at: http://localhost:${PORT}/uploads`);
      console.log(`🔗 Socket.IO server ready for connections`);
      console.log(`🎯 Frontend URL: http://localhost:4200`);
      console.log(`🎯 Backend URL: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  
  try {
    // Close database connections
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    // Close Redis connection
    const { client: redisClient } = require('./redisClient');
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    }
    
    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

start();
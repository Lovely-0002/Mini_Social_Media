const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { connectRedis, client: redisClient } = require('./redisClient');

// Import all route files
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const userRoutes = require('./routes/users');

const app = express();

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

// Register all routes
app.use('/chat', chatRoutes);
app.use('/ai', aiRoutes);
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/friends', friendRoutes);
app.use('/users', userRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Keep track of online users
const users = {};

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    users[userId] = socket.id;
    console.log(`User connected: ${userId}`);
  }

  // Private message handling logic here (as discussed earlier)

  socket.on('disconnect', () => {
    if (userId) {
      delete users[userId];
      console.log(`User disconnected: ${userId}`);
    }
  });
});

// Connect DBs and start server
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    await connectRedis();
    console.log('Redis connected');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Startup error:', err);
  }
}

start();
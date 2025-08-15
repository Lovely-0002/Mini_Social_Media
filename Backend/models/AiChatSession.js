const mongoose = require('mongoose');

const aiChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const aiChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  messages: [aiChatMessageSchema]
});

module.exports = mongoose.model('AiChatSession', aiChatSessionSchema);

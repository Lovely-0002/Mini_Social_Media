const mongoose = require('mongoose');

const impressionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment'], required: true },
  commentText: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Impression', impressionSchema);

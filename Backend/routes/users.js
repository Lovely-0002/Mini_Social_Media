const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  res.json(user);
});

router.put('/:id', authMiddleware, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
  res.json(updatedUser);
});

module.exports = router;

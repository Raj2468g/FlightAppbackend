const express = require('express');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  const db = req.app.locals.db;

  try {
    if (!username || !password || !role) {
      console.log('Missing fields:', { username, password, role });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    console.log('Login attempt:', { username, password, role });
    const user = await db.collection('users').findOne({ 
      username: { $regex: `^${username}$`, $options: 'i' }, // Case-insensitive
      password,
      role
    });
    if (user) {
      console.log('User found:', user);
      res.json({ success: true, userId: user._id });
    } else {
      console.log('No user found for:', { username, password, role });
      // Debug: Check all users with matching username
      const users = await db.collection('users').find({ username: { $regex: `^${username}$`, $options: 'i' } }).toArray();
      console.log('All users with username:', users);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
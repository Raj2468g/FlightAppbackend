const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/userLogin', async (req, res) => {
  const { username, password } = req.body;
  console.log('Received login request:', { username, password });
  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      'your_jwt_secret', // Replace with your JWT secret
      { expiresIn: '1h' }
    );

    console.log('Login successful for user:', username);
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error in userLogin:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/adminLogin', async (req, res) => {
  const { username, password } = req.body;
  console.log('Received admin login request:', { username, password });
  try {
    const user = await User.findOne({ username, role: 'admin' });
    if (!user) {
      console.log('Admin not found:', username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for admin:', username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      'your_jwt_secret',
      { expiresIn: '1h' }
    );

    console.log('Admin login successful:', username);
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error in adminLogin:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
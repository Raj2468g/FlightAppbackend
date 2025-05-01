const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}
connectDB().catch(err => console.error('Failed to connect to MongoDB:', err));

const db = client.db('flightapp');
const usersCollection = db.collection('users');

// User Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await usersCollection.findOne({ username, role: 'user' });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    console.log('User logged in:', username);
    res.json({
      user: {
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: 'dummy-token-user'
    });
  } catch (err) {
    console.error('Error during user login:', err);
    res.status(500).json({ error: 'Failed to login', details: err.message });
  }
});

// Admin Login
router.post('/adminLogin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await usersCollection.findOne({ username, role: 'admin' });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    console.log('Admin logged in:', username);
    res.json({
      user: {
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: 'dummy-token-admin'
    });
  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).json({ error: 'Failed to login', details: err.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

module.exports = router;
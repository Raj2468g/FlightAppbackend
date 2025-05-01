const express = require('express');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  try {
    console.log('Register request:', req.body);
    const { username, password, phone, email, gender, role } = req.body;

    // Server-side validation
    if (!username || !password || !email) {
      console.log('Missing fields:', { username, password, email });
      return res.status(400).json({ success: false, message: 'Username, password, and email are required' });
    }
    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      console.log('Invalid username format:', username);
      return res.status(400).json({ success: false, message: 'Username must be 4-20 alphanumeric characters' });
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      console.log('Password too short:', password);
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingUser = await db.collection('users').findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('User exists:', { username, email });
      if (existingUser.username === username) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    const newUser = {
      username,
      password, // Plain-text as per requirement
      phone: phone || '',
      email,
      gender: gender || '',
      role: role || 'user',
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    console.log('User registered:', { username, userId: result.insertedId });
    res.status(201).json({ success: true, message: 'User registered successfully', userId: result.insertedId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Booking endpoint
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { userId, flightId, bookingDate } = req.body;
    if (!userId || !flightId || !bookingDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const flight = await db.collection('flights').findOne({ _id: flightId });
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const bookingCount = await db.collection('bookings').countDocuments({ flightId });
    if (bookingCount >= flight.maxTickets) {
      return res.status(400).json({ error: 'Flight is fully booked' });
    }

    const booking = { userId, flightId, bookingDate };
    const result = await db.collection('bookings').insertOne(booking);
    res.json({ _id: result.insertedId, ...booking });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User bookings endpoint
router.get('/user/:userId', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { userId } = req.params;
    const bookings = await db.collection('bookings').find({ userId }).toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { username, password, role } = req.body;

    console.log('Login request:', { username, password, role });
    if (!username || !password || !role) {
      console.log('Missing fields:', { username, password, role });
      return res.status(400).json({ success: false, error: 'Missing username, password, or role' });
    }

    const user = await db.collection('users').findOne({ 
      username: { $regex: `^${username}$`, $options: 'i' },
      password,
      role: { $regex: `^${role}$`, $options: 'i' }
    });

    if (user) {
      console.log('User found:', { _id: user._id, username: user.username, role: user.role });
      res.json({ success: true, userId: user._id, role: user.role });
    } else {
      console.log('No user found for:', { username, password, role });
      const users = await db.collection('users').find({ username: { $regex: `^${username}$`, $options: 'i' } }).toArray();
      console.log('Users with username:', users);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
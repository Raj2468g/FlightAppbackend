const express = require('express');
const router = express.Router();



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

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  const db = req.app.locals.db;

  try {
    if (!username || !password || !role) {
      console.log('Missing fields:', { username, password, role });
      return res.status(400).json({ success: false, error: 'Missing username, password, or role' });
    }
    console.log('Login attempt:', { username, password, role });
    const user = await db.collection('users').findOne({ 
      username,
      password,
      role
    });
    if (user) {
      console.log('User found:', { _id: user._id, username: user.username, role: user.role });
      res.json({ success: true, userId: user._id });
    } else {
      console.log('No user found for:', { username, password, role });
      const users = await db.collection('users').find({ username }).toArray();
      console.log('Users with username:', users);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
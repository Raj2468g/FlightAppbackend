const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 5000;
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'flightapp';
const jwtSecret = 'your_jwt_secret'; // Replace with secure secret in production

app.use(cors());
app.use(express.json());

let db;

async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

connectToMongo();

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Admin-only middleware
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Auth Routes
app.post('/api/userLogin', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Received userLogin request:', { username });
    const user = await db.collection('users').findOne({ username, password });
    if (!user) {
      console.log('Invalid credentials for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { _id: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );
    console.log('Login successful for user:', username);
    res.json({
      token,
      user: { _id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Error in userLogin:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/adminLogin', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Received adminLogin request:', { username });
    const user = await db.collection('users').findOne({ username, password, role: 'admin' });
    if (!user) {
      console.log('Invalid admin credentials for:', username);
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    const token = jwt.sign(
      { _id: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );
    console.log('Admin login successful:', username);
    res.json({
      token,
      user: { _id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Error in adminLogin:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// User Routes
app.get('/api/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const user = req.body;
    user.createdAt = new Date().toISOString();
    user.role = user.role || 'user';
    const result = await db.collection('users').insertOne(user);
    res.status(201).json({ _id: result.insertedId, ...user });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    delete user._id;
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: user }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ _id: id, ...user });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Flight Routes
app.get('/api/flights', authenticateToken, async (req, res) => {
  try {
    const flights = await db.collection('flights').find().toArray();
    res.json(flights);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/flights', authenticateToken, adminOnly, async (req, res) => {
  try {
    const flight = req.body;
    flight.availableTickets = flight.maxTickets;
    const result = await db.collection('flights').insertOne(flight);
    res.status(201).json({ _id: result.insertedId, ...flight });
  } catch (err) {
    console.error('Error adding flight:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.put('/api/flights/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const flight = req.body;
    delete flight._id;
    const result = await db.collection('flights').updateOne(
      { _id: new ObjectId(id) },
      { $set: flight }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Flight not found' });
    res.json({ _id: id, ...flight });
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.delete('/api/flights/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('flights').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Flight not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Booking Routes
app.get('/api/bookings', authenticateToken, adminOnly, async (req, res) => {
  try {
    const bookings = await db.collection('bookings').find().toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/api/bookings/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user._id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const bookings = await db.collection('bookings').find({ userId }).toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const booking = req.body;
    const flight = await db.collection('flights').findOne({ _id: new ObjectId(booking.flightId) });
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    if (booking.seats > flight.availableTickets) {
      return res.status(400).json({ error: 'Not enough available tickets' });
    }
    booking.userId = req.user._id;
    booking.username = req.user.username;
    const result = await db.collection('bookings').insertOne(booking);
    await db.collection('flights').updateOne(
      { _id: new ObjectId(booking.flightId) },
      { $inc: { availableTickets: -booking.seats } }
    );
    res.status(201).json({ _id: result.insertedId, ...booking });
  } catch (err) {
    console.error('Error adding booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.put('/api/bookings/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = req.body;
    delete booking._id;
    const oldBooking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!oldBooking) return res.status(404).json({ error: 'Booking not found' });
    const flight = await db.collection('flights').findOne({ _id: new ObjectId(booking.flightId) });
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    const seatDiff = booking.seats - oldBooking.seats;
    if (seatDiff > flight.availableTickets) {
      return res.status(400).json({ error: 'Not enough available tickets' });
    }
    const result = await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: booking }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Booking not found' });
    await db.collection('flights').updateOne(
      { _id: new ObjectId(booking.flightId) },
      { $inc: { availableTickets: -seatDiff } }
    );
    res.json({ _id: id, ...booking });
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.delete('/api/bookings/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const result = await db.collection('bookings').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Booking not found' });
    await db.collection('flights').updateOne(
      { _id: new ObjectId(booking.flightId) },
      { $inc: { availableTickets: booking.seats } }
    );
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
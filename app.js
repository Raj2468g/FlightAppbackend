const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 5000;
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'flightapp';
const jwtSecret = 'your_jwt_secret'; // Replace with a secure secret

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

// User Routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const users = await db.collection('users').find().toArray();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const user = req.body;
    user.createdAt = new Date().toISOString();
    const result = await db.collection('users').insertOne(user);
    res.status(201).json({ _id: result.insertedId, ...user });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
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

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
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
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const flights = await db.collection('flights').find().toArray();
    res.json(flights);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/flights', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const flight = req.body;
    flight.availableTickets = flight.maxTickets; // Initialize available tickets
    const result = await db.collection('flights').insertOne(flight);
    res.status(201).json({ _id: result.insertedId, ...flight });
  } catch (err) {
    console.error('Error adding flight:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.put('/api/flights/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
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

app.delete('/api/flights/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
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
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const bookings = await db.collection('bookings').find().toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const booking = req.body;
    const flight = await db.collection('flights').findOne({ _id: new ObjectId(booking.flightId) });
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    if (booking.seats > flight.availableTickets) {
      return res.status(400).json({ error: 'Not enough available tickets' });
    }
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

app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
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

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
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

// Login Routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection('users').findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ _id: user._id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '1h' });
    res.json({ user, token });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/adminLogin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection('users').findOne({ username, password, role: 'admin' });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
    const token = jwt.sign({ _id: user._id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '1h' });
    res.json({ user, token });
  } catch (err) {
    console.error('Error logging in as admin:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
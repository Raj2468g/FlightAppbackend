const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const verifyToken = require('../middleware/auth');

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
const bookingsCollection = db.collection('bookings');
const flightsCollection = db.collection('flights');
const usersCollection = db.collection('users');

// Get all bookings
router.get('/', verifyToken, async (req, res) => {
  try {
    const bookings = await bookingsCollection.find().toArray();
    console.log('Raw bookings from DB:', bookings);
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const flight = await flightsCollection.findOne({ _id: new ObjectId(booking.flightId) });
        const user = await usersCollection.findOne({ _id: new ObjectId(booking.userId) });
        return {
          ...booking,
          flightNumber: flight?.flightNumber || 'Unknown',
          username: user?.username || 'Unknown'
        };
      })
    );
    console.log('Fetched bookings with details:', bookingsWithDetails);
    res.json(bookingsWithDetails);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});

// Get user bookings
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Cannot view bookings of other users.' });
    }
    const bookings = await bookingsCollection.find({ userId: new ObjectId(userId) }).toArray();
    console.log('Raw user bookings from DB:', bookings);
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const flight = await flightsCollection.findOne({ _id: new ObjectId(booking.flightId) });
        const user = await usersCollection.findOne({ _id: new ObjectId(booking.userId) });
        return {
          ...booking,
          flightNumber: flight?.flightNumber || 'Unknown',
          username: user?.username || 'Unknown'
        };
      })
    );
    console.log('Fetched user bookings:', bookingsWithDetails);
    res.json(bookingsWithDetails);
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ error: 'Failed to fetch user bookings', details: err.message });
  }
});

// Add a booking
router.post('/', verifyToken, async (req, res) => {
  try {
    const flight = await flightsCollection.findOne({ _id: new ObjectId(req.body.flightId) });
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    const user = await usersCollection.findOne({ _id: new ObjectId(req.body.userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.body.seats > flight.availableTickets) {
      return res.status(400).json({ error: `Only ${flight.availableTickets} tickets available` });
    }
    const booking = {
      flightId: new ObjectId(req.body.flightId),
      flightNumber: flight.flightNumber,
      userId: new ObjectId(req.body.userId),
      username: user.username,
      seats: req.body.seats,
      totalPrice: req.body.seats * flight.price,
      bookingDate: req.body.bookingDate
    };
    console.log('Adding booking:', booking);
    const result = await bookingsCollection.insertOne(booking);
    await flightsCollection.updateOne(
      { _id: new ObjectId(req.body.flightId) },
      { $inc: { availableTickets: -req.body.seats } }
    );
    console.log('Booking added:', result.insertedId);
    res.status(201).json({ ...booking, _id: result.insertedId });
  } catch (err) {
    console.error('Error adding booking:', err);
    res.status(500).json({ error: 'Failed to add booking', details: err.message });
  }
});

// Delete a booking
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    // Check if user owns the booking or is admin
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You can only cancel your own bookings.' });
    }
    console.log('Deleting booking:', id);
    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    await flightsCollection.updateOne(
      { _id: booking.flightId },
      { $inc: { availableTickets: booking.seats } }
    );
    console.log('Booking deleted:', id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Failed to delete booking', details: err.message });
  }
});

module.exports = router;
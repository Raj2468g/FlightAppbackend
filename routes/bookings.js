const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

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
router.get('/', async (req, res) => {
  try {
    const bookings = await bookingsCollection.find().toArray();
    console.log('Raw bookings from DB:', bookings);
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const flight = await flightsCollection.findOne({ flightNumber: booking.flightId });
        const user = await usersCollection.findOne({ username: booking.userId });
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

// Add a booking
router.post('/', async (req, res) => {
  try {
    const flight = await flightsCollection.findOne({ flightNumber: req.body.flightId });
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    const user = await usersCollection.findOne({ username: req.body.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.body.seats > flight.availableTickets) {
      return res.status(400).json({ error: `Only ${flight.availableTickets} tickets available` });
    }
    if (req.body.seatNumber.length !== req.body.seats) {
      return res.status(400).json({ error: `Please provide exactly ${req.body.seats} seat numbers` });
    }
    const existingSeats = await bookingsCollection.find({
      flightId: req.body.flightId,
      seatNumber: { $in: req.body.seatNumber }
    }).toArray();
    if (existingSeats.length > 0) {
      return res.status(400).json({ error: 'One or more seat numbers are already booked' });
    }
    const booking = {
      flightId: req.body.flightId, // flightNumber, e.g., 'AA123'
      flightNumber: flight.flightNumber,
      userId: req.body.userId, // username, e.g., '18960'
      username: user.username,
      seats: req.body.seats,
      seatNumber: req.body.seatNumber,
      totalPrice: req.body.seats * flight.price,
      bookingDate: req.body.bookingDate
    };
    console.log('Adding booking:', booking);
    const result = await bookingsCollection.insertOne(booking);
    await flightsCollection.updateOne(
      { flightNumber: req.body.flightId },
      { $inc: { availableTickets: -req.body.seats } }
    );
    console.log('Booking added:', result.insertedId);
    res.status(201).json({ ...booking, _id: result.insertedId });
  } catch (err) {
    console.error('Error adding booking:', err);
    res.status(500).json({ error: 'Failed to add booking', details: err.message });
  }
});

// Update a booking
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existingBooking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const flight = await flightsCollection.findOne({ flightNumber: req.body.flightId });
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    const user = await usersCollection.findOne({ username: req.body.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const availableTickets = flight.availableTickets + existingBooking.seats;
    if (req.body.seats > availableTickets) {
      return res.status(400).json({ error: `Only ${availableTickets} tickets available` });
    }
    if (req.body.seatNumber.length !== req.body.seats) {
      return res.status(400).json({ error: `Please provide exactly ${req.body.seats} seat numbers` });
    }
    const existingSeats = await bookingsCollection.find({
      flightId: req.body.flightId,
      seatNumber: { $in: req.body.seatNumber },
      _id: { $ne: new ObjectId(id) }
    }).toArray();
    if (existingSeats.length > 0) {
      return res.status(400).json({ error: 'One or more seat numbers are already booked' });
    }
    const booking = {
      flightId: req.body.flightId,
      flightNumber: flight.flightNumber,
      userId: req.body.userId,
      username: user.username,
      seats: req.body.seats,
      seatNumber: req.body.seatNumber,
      totalPrice: req.body.seats * flight.price,
      bookingDate: existingBooking.bookingDate
    };
    console.log('Updating booking:', id, booking);
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: booking }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    await flightsCollection.updateOne(
      { flightNumber: req.body.flightId },
      { $inc: { availableTickets: existingBooking.seats - req.body.seats } }
    );
    console.log('Booking updated:', id);
    res.json({ ...booking, _id: id });
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Failed to update booking', details: err.message });
  }
});

// Delete a booking
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    console.log('Deleting booking:', id);
    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    await flightsCollection.updateOne(
      { flightNumber: booking.flightId },
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
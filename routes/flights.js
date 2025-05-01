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
  }
}
connectDB();

const db = client.db('flightapp');
const flightsCollection = db.collection('flights');
const bookingsCollection = db.collection('bookings');

// Get all flights with available tickets
router.get('/', async (req, res) => {
  try {
    const flights = await flightsCollection.find().toArray();
    const flightsWithAvailableTickets = await Promise.all(
      flights.map(async (flight) => {
        const bookings = await bookingsCollection.countDocuments({ flightId: flight._id.toString() });
        return { ...flight, availableTickets: flight.maxTickets - bookings };
      })
    );
    res.json(flightsWithAvailableTickets);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

// Add a flight
router.post('/', async (req, res) => {
  try {
    const flight = {
      flightNumber: req.body.flightNumber,
      departure: req.body.departure,
      destination: req.body.destination,
      date: req.body.date,
      time: req.body.time || '',
      maxTickets: req.body.maxTickets,
      price: req.body.price,
      availableTickets: req.body.maxTickets // Initialize to maxTickets
    };
    console.log('Adding flight:', flight);
    const result = await flightsCollection.insertOne(flight);
    console.log('Flight added:', result.insertedId);
    res.status(201).json({ ...flight, _id: result.insertedId });
  } catch (err) {
    console.error('Error adding flight:', err);
    res.status(500).json({ error: 'Failed to add flight' });
  }
});

// Update a flight
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const flight = {
      flightNumber: req.body.flightNumber,
      departure: req.body.departure,
      destination: req.body.destination,
      date: req.body.date,
      time: req.body.time || '',
      maxTickets: req.body.maxTickets,
      price: req.body.price,
      availableTickets: req.body.availableTickets
    };
    console.log('Updating flight:', id, flight);
    const result = await flightsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: flight }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    console.log('Flight updated:', id);
    res.json({ ...flight, _id: id });
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(500).json({ error: 'Failed to update flight' });
  }
});

// Delete a flight
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Deleting flight:', id);
    const result = await flightsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    console.log('Flight deleted:', id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ error: 'Failed to delete flight' });
  }
});

module.exports = router;
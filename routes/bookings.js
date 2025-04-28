const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// Get all bookings (admin)
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const bookings = await db.collection('bookings').aggregate([
      {
        $lookup: {
          from: 'flights',
          localField: 'flightId',
          foreignField: '_id',
          as: 'flightId_details'
        }
      },
      { $unwind: { path: '$flightId_details', preserveNullAndEmptyArrays: true } }
    ]).toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user bookings
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = req.app.locals.db;
  try {
    const bookings = await db.collection('bookings').aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'flights',
          localField: 'flightId',
          foreignField: '_id',
          as: 'flightId_details'
        }
      },
      { $unwind: { path: '$flightId_details', preserveNullAndEmptyArrays: true } }
    ]).toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Book a ticket
router.post('/', async (req, res) => {
  const { userId, flightId, bookingDate } = req.body;
  const db = req.app.locals.db;
  try {
    if (!userId || !flightId || !bookingDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Verify flight exists
    const flight = await db.collection('flights').findOne({ _id: flightId });
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    // Check max tickets (added for new feature)
    const bookingCount = await db.collection('bookings').countDocuments({ flightId });
    if (flight.maxTickets && bookingCount >= flight.maxTickets) {
      return res.status(400).json({ error: 'Flight is fully booked' });
    }
    const result = await db.collection('bookings').insertOne({ userId, flightId, bookingDate });
    res.json({ _id: result.insertedId, userId, flightId, bookingDate });
  } catch (err) {
    console.error('Error booking ticket:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a booking
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const db = req.app.locals.db;
  console.log("delete 2 hit");
  try {
    const result = await db.collection('bookings').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get all flights
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const flights = await db.collection('flights').find().toArray();
    res.json(flights);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a flight
router.post('/', async (req, res) => {
  const { flightNumber, origin, destination, departureTime, price, maxTickets } = req.body;
  const db = req.app.locals.db;
  try {
    const result = await db.collection('flights').insertOne({
      flightNumber,
      origin,
      destination,
      departureTime,
      price: Number(price),
      maxTickets: maxTickets ? Number(maxTickets) : undefined
    });
    res.json({ _id: result.insertedId, ...req.body });
  } catch (err) {
    console.error('Error adding flight:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a flight
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { flightNumber, origin, destination, departureTime, price, maxTickets } = req.body;
  const db = req.app.locals.db;
  try {
    const result = await db.collection('flights').updateOne(
      { _id: id },
      { $set: { 
        flightNumber, 
        origin, 
        destination, 
        departureTime, 
        price: Number(price),
        maxTickets: maxTickets ? Number(maxTickets) : undefined 
      } }
    );
    if (result.modifiedCount === 1) {
      res.json({ _id: id, ...req.body });
    } else {
      res.status(404).json({ error: 'Flight not found' });
    }
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a flight
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const db = req.app.locals.db;
  console.log("delete hit");
  const newObj = { $oid : id};
  try {
    const result = await db.collection('flights').deleteOne({ _id : new ObjectId(id) });
    console.log("result: " + result);
    console.log(result.deletedCount);
    if (result.deletedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Flight not found' });
    }
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
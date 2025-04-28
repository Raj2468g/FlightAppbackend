const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const flights = await db.collection('flights').find().toArray();
    console.log('Fetched flights:', flights);
    res.json(flights);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const flight = {
      ...req.body,
      _id: req.body._id || new Date().toISOString(),
      maxTickets: req.body.maxTickets || 100
    };
    const result = await db.collection('flights').insertOne(flight);
    res.json({ _id: result.insertedId, ...flight });
  } catch (err) {
    console.error('Error adding flight:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { id } = req.params;
    const flight = req.body;
    await db.collection('flights').updateOne({ _id: id }, { $set: flight });
    res.json(flight);
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { id } = req.params;
    await db.collection('flights').deleteOne({ _id: id });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
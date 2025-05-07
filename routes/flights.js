const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (db) => {
  const flightsCollection = db.collection('flights');
  const bookingsCollection = db.collection('bookings');

  // Validation helper
  const validateFlight = (flight, isUpdate = false) => {
    const errors = [];
    if (!isUpdate && !flight.flightNumber) errors.push('Flight number is required');
    if (flight.flightNumber && !/^[A-Z0-9]{2,6}$/.test(flight.flightNumber)) {
      errors.push('Flight number must be 2-6 alphanumeric characters');
    }
    if (!flight.departure) errors.push('Departure is required');
    if (!flight.destination) errors.push('Destination is required');
    if (!flight.date) errors.push('Date is required');
    if (!flight.maxTickets || flight.maxTickets < 1) errors.push('Max tickets must be at least 1');
    if (!flight.price || flight.price < 0) errors.push('Price must be non-negative');
    return errors;
  };

  // Get all flights with available tickets
  router.get('/', async (req, res) => {
    try {
      const flights = await flightsCollection.find().toArray();
      const flightsWithAvailableTickets = await Promise.all(
        flights.map(async (flight) => {
          const bookings = await bookingsCollection.countDocuments({ flightId: flight.flightNumber });
          return { ...flight, availableTickets: flight.maxTickets - bookings };
        })
      );
      console.log('Fetched flights:', flightsWithAvailableTickets);
      res.json(flightsWithAvailableTickets);
    } catch (err) {
      console.error('Error fetching flights:', err);
      res.status(500).json({ error: 'Failed to fetch flights', details: err.message });
    }
  });

  // Add a flight
  router.post('/', async (req, res) => {
    try {
      const { _id, ...flight } = req.body; // Exclude _id
      flight.maxTickets = parseInt(flight.maxTickets);
      flight.price = parseFloat(flight.price);
      flight.availableTickets = parseInt(flight.maxTickets);
      flight.time = flight.time || '';

      const errors = validateFlight(flight);
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const existingFlight = await flightsCollection.findOne({ flightNumber: flight.flightNumber });
      if (existingFlight) {
        return res.status(400).json({ error: 'Flight number already exists' });
      }

      console.log('Adding flight:', flight);
      const result = await flightsCollection.insertOne(flight);
      console.log('Flight added:', result.insertedId);
      res.status(201).json({ ...flight, _id: result.insertedId });
    } catch (err) {
      console.error('Error adding flight:', err);
      res.status(500).json({ error: 'Failed to add flight', details: err.message });
    }
  });

  // Update a flight
  router.put('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const { _id, ...flight } = req.body; // Exclude _id
      flight.maxTickets = parseInt(flight.maxTickets);
      flight.price = parseFloat(flight.price);
      flight.availableTickets = parseInt(flight.availableTickets);
      flight.time = flight.time || '';

      const errors = validateFlight(flight, true);
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const existingFlight = await flightsCollection.findOne({ _id: new ObjectId(id) });
      if (!existingFlight) {
        return res.status(404).json({ error: 'Flight not found' });
      }

      const bookingsCount = await bookingsCollection.countDocuments({ flightId: flight.flightNumber });
      if (flight.maxTickets < bookingsCount) {
        return res.status(400).json({ error: `Cannot reduce max tickets below booked tickets (${bookingsCount})` });
      }
      flight.availableTickets = flight.maxTickets - bookingsCount;

      if (flight.flightNumber !== existingFlight.flightNumber) {
        const duplicateFlight = await flightsCollection.findOne({ flightNumber: flight.flightNumber });
        if (duplicateFlight) {
          return res.status(400).json({ error: 'Flight number already exists' });
        }
      }

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
      res.status(500).json({ error: 'Failed to update flight', details: err.message });
    }
  });

  // Delete a flight
  router.delete('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const flight = await flightsCollection.findOne({ _id: new ObjectId(id) });
      if (!flight) {
        return res.status(404).json({ error: 'Flight not found' });
      }

      const bookingsCount = await bookingsCollection.countDocuments({ flightId: flight.flightNumber });
      if (bookingsCount > 0) {
        return res.status(400).json({ error: 'Cannot delete flight with existing bookings' });
      }

      console.log('Deleting flight:', id);
      const result = await flightsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Flight not found' });
      }
      console.log('Flight deleted:', id);
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting flight:', err);
      res.status(500).json({ error: 'Failed to delete flight', details: err.message });
    }
  });

  return router;
};
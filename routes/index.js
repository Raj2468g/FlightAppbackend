const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const flightsRouter = require('./routes/flights');
const bookingsRouter = require('./routes/bookings');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/flightBooking', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  app.locals.db = mongoose.connection.db;
}).catch(err => console.error('MongoDB connection error:', err));

app.use('/api/flights', flightsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/auth', authRouter);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
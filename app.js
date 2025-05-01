const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.use('/api/users', require('./routes/users'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/flights', require('./routes/flights')); // If exists

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
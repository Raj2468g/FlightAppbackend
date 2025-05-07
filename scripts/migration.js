const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const db = client.db("flightapp");

function generateSeats(maxTickets) {
  const seats = [];
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const seatsPerRow = 10;
  let seatsGenerated = 0;
  for (let row of rows) {
    for (let seat = 1; seat <= seatsPerRow; seat++) {
      if (seatsGenerated < maxTickets) {
        seats.push(`${row}${seat}`);
        seatsGenerated++;
      } else {
        return seats;
      }
    }
  }
  return seats;
}

let userIdMap = {};
db.users.find({ _id: { $not: /^u\d+$/ } }).forEach(function(user) {
  let sequence = db.counters.findOneAndUpdate(
    { _id: "users" },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after' }
  ).sequence;
  let newId = `u${sequence}`;
  userIdMap[user._id.toString()] = newId;
  db.users.insertOne({
    _id: newId,
    username: user.username,
    password: user.password,
    phone: user.phone || '',
    email: user.email,
    gender: user.gender || '',
    role: user.role,
    createdAt: user.createdAt || new Date()
  });
  db.users.deleteOne({ _id: user._id });
  print(`Migrated user ${user._id} to ${newId}`);
});

let flightIdMap = {};
db.flights.find({ _id: { $not: /^f\d+$/ } }).forEach(function(flight) {
  let sequence = db.counters.findOneAndUpdate(
    { _id: "flights" },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after' }
  ).sequence;
  let newId = `f${sequence}`;
  flightIdMap[flight._id.toString()] = newId;
  let seats = generateSeats(flight.maxTickets);
  let validBookedSeats = (flight.bookedSeats || []).filter(seat => seats.includes(seat));
  db.flights.insertOne({
    _id: newId,
    flightNumber: flight.flightNumber,
    departure: flight.departure,
    destination: flight.destination,
    date: flight.date,
    time: flight.time,
    maxTickets: flight.maxTickets,
    price: flight.price,
    availableTickets: flight.maxTickets - validBookedSeats.length,
    seats: seats,
    bookedSeats: validBookedSeats,
    version: flight.version || 1
  });
  db.flights.deleteOne({ _id: flight._id });
  print(`Migrated flight ${flight._id} to ${newId}`);
});

db.bookings.find({ _id: { $not: /^b\d+$/ } }).forEach(function(booking) {
  let newFlightId = flightIdMap[booking.flightId.toString()];
  let newUserId = userIdMap[booking.userId.toString()];
  if (!newFlightId || !newUserId) {
    db.bookings.deleteOne({ _id: booking._id });
    print(`Deleted booking ${booking._id} due to missing flight or user ID`);
    return;
  }
  let flight = db.flights.findOne({ _id: newFlightId });
  if (!flight) {
    db.bookings.deleteOne({ _id: booking._id });
    print(`Deleted booking ${booking._id} due to missing flight`);
    return;
  }
  let seatNumbers = booking.seatNumber || [];
  if (seatNumbers.length < booking.seats) {
    let availableSeats = flight.seats.filter(seat => !flight.bookedSeats.includes(seat));
    seatNumbers = availableSeats.slice(0, booking.seats);
    if (seatNumbers.length < booking.seats) {
      print(`Warning: Not enough seats for booking ${booking._id}`);
      db.bookings.deleteOne({ _id: booking._id });
      return;
    }
    db.flights.updateOne(
      { _id: newFlightId },
      {
        $push: { bookedSeats: { $each: seatNumbers } },
        $inc: { availableTickets: -booking.seats }
      }
    );
  }
  let sequence = db.counters.findOneAndUpdate(
    { _id: "bookings" },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after' }
  ).sequence;
  let newId = `b${sequence}`;
  db.bookings.insertOne({
    _id: newId,
    flightId: newFlightId,
    flightNumber: flight.flightNumber,
    userId: newUserId,
    username: booking.username,
    seats: booking.seats,
    seatNumber: seatNumbers,
    totalPrice: booking.totalPrice,
    bookingDate: booking.bookingDate
  });
  db.bookings.deleteOne({ _id: booking._id });
  print(`Migrated booking ${booking._id} to ${newId}`);
});

print("Migration completed. Current counters:", db.counters.find().toArray());
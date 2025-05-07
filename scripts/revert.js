const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("flightapp");

// Step 1: Create temporary collections for new documents
db.createCollection("users_temp");
db.createCollection("flights_temp");
db.createCollection("bookings_temp");

// Step 2: Map custom IDs to new ObjectIds
let userIdMap = {};
db.users.find().forEach(function(user) {
  let newId = new ObjectId();
  userIdMap[user._id] = newId;
  db.users_temp.insertOne({
    _id: newId,
    username: user.username,
    password: user.password,
    phone: user.phone || '',
    email: user.email,
    gender: user.gender || '',
    role: user.role,
    createdAt: user.createdAt || new Date()
  });
  print(`Mapped user ${user._id} to ${newId}`);
});

let flightIdMap = {};
db.flights.find().forEach(function(flight) {
  let newId = new ObjectId();
  flightIdMap[flight._id] = newId;
  db.flights_temp.insertOne({
    _id: newId,
    flightNumber: flight.flightNumber,
    departure: flight.departure,
    destination: flight.destination,
    date: flight.date,
    time: flight.time,
    maxTickets: flight.maxTickets,
    price: flight.price,
    availableTickets: flight.availableTickets,
    version: flight.version || 1
  });
  print(`Mapped flight ${flight._id} to ${newId}`);
});

// Step 3: Process bookings with new ObjectIds
db.bookings.find().forEach(function(booking) {
  let newFlightId = flightIdMap[booking.flightId];
  let newUserId = userIdMap[booking.userId];
  if (!newFlightId || !newUserId) {
    print(`Skipping booking ${booking._id} due to missing flight or user ID`);
    return;
  }
  db.bookings_temp.insertOne({
    _id: new ObjectId(),
    flightId: newFlightId,
    flightNumber: booking.flightNumber,
    userId: newUserId,
    username: booking.username,
    seats: booking.seats,
    totalPrice: booking.totalPrice,
    bookingDate: booking.bookingDate
  });
  print(`Processed booking ${booking._id}`);
});

// Step 4: Drop old collections and rename new ones
db.users.drop();
db.flights.drop();
db.bookings.drop();
db.counters.drop();

db.users_temp.renameCollection("users");
db.flights_temp.renameCollection("flights");
db.bookings_temp.renameCollection("bookings");

print("Schema reversion completed. Current collections:");
printjson(db.getCollectionNames());
  } // Closing the run function
  catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await client.close();
  }
}
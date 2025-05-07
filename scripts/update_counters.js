const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("flightapp");

db.counters.updateOne(
  { _id: "users" },
  { $setOnInsert: { sequence: 0 } },
  { upsert: true }
);
db.counters.updateOne(
  { _id: "flights" },
  { $setOnInsert: { sequence: 0 } },
  { upsert: true }
);
db.counters.updateOne(
  { _id: "bookings" },
  { $setOnInsert: { sequence: 0 } },
  { upsert: true }
);

let maxUserId = 0;
db.users.find().forEach(function(user) {
  let idStr = user._id.toString();
  if (idStr.match(/^u\d+$/)) {
    let num = parseInt(idStr.replace('u', ''));
    if (num > maxUserId) maxUserId = num;
  }
});
db.counters.updateOne(
  { _id: "users" },
  { $set: { sequence: maxUserId } }
);
print(`Max user ID: u${maxUserId}`);

let maxFlightId = 0;
db.flights.find().forEach(function(flight) {
  let idStr = flight._id.toString();
  if (idStr.match(/^f\d+$/)) {
    let num = parseInt(idStr.replace('f', ''));
    if (num > maxFlightId) maxFlightId = num;
  }
});
db.counters.updateOne(
  { _id: "flights" },
  { $set: { sequence: maxFlightId } }
);
print(`Max flight ID: f${maxFlightId}`);

let maxBookingId = 0;
db.bookings.find().forEach(function(booking) {
  let idStr = booking._id.toString();
  if (idStr.match(/^b\d+$/)) {
    let num = parseInt(idStr.replace('b', ''));
    if (num > maxBookingId) maxBookingId = num;
  }
});
db.counters.updateOne(
  { _id: "bookings" },
  { $set: { sequence: maxBookingId } }
);
console.log(`Max booking ID: b${maxBookingId}`);

const counters = await db.counters.find().toArray();
console.log("Current counters:", counters);
  } 
  finally {
    await client.close();
  }
}

run().catch(console.dir);

db.counters.updateOne(
  { _id: "bookings" },
  { $set: { sequence: maxBookingId } }
);
print(`Max booking ID: b${maxBookingId}`);

print("Current counters:", db.counters.find().toArray());
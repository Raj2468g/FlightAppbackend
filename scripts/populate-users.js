const { MongoClient } = require('mongodb');

async function populateData() {
  const url = 'mongodb://localhost:27017';
  const dbName = 'flightapp';
  let client;

  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);

    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('flights').deleteMany({});
    console.log('Cleared existing users and flights');

    // Insert users
    const users = [
      {
        username: '18960',
        password: '123',
        phone: '',
        email: 'user18960@example.com',
        gender: '',
        role: 'user',
        createdAt: new Date()
      },
      {
        username: 'admin',
        password: 'admin123',
        phone: '0987654321',
        email: 'admin@example.com',
        gender: 'female',
        role: 'admin',
        createdAt: new Date()
      }
    ];
    await db.collection('users').insertMany(users);
    console.log('Inserted users');

    // Insert flights
    const flights = [
      {
        flightNumber: 'AA123',
        origin: 'New York',
        destination: 'London',
        departureTime: '2025-05-10T10:00:00Z',
        maxTickets: 100,
        price: 500
      },
      {
        flightNumber: 'BA456',
        origin: 'London',
        destination: 'Paris',
        departureTime: '2025-05-11T14:00:00Z',
        maxTickets: 80,
        price: 300
      }
    ];
    await db.collection('flights').insertMany(flights);
    console.log('Inserted flights');
  } catch (err) {
    console.error('Error populating data:', err);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

populateData();
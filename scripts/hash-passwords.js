const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function hashExistingPasswords() {
  const url = 'mongodb://localhost:27017';
  const dbName = 'flightapp';
  const collectionName = 'users';
  let client;

  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const users = await collection.find({}).toArray();
    const saltRounds = 10;

    for (const user of users) {
      if (!user.password.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        await collection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        console.log(`Updated password for user: ${user.username}`);
      }
    }

    console.log('All passwords hashed successfully');
  } catch (err) {
    console.error('Error hashing passwords:', err);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

hashExistingPasswords();
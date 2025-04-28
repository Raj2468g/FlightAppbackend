const { ObjectId } = require('mongodb');

const getBookings = async (db) => {
  return await db.collection('bookings').aggregate([
    {
      $lookup: {
        from: 'flights',
        localField: 'flightId',
        foreignField: '_id',
        as: 'flightId_details'
      }
    },
    { $unwind: { path: '$flightId_details', preserveNullAndEmptyArrays: true } }
  ]).toArray();
};

const getUserBookings = async (db, userId) => {
  return await db.collection('bookings').aggregate([
    { $match: { userId } },
    {
      $lookup: {
        from: 'flights',
        localField: 'flightId',
        foreignField: '_id',
        as: 'flightId_details'
      }
    },
    { $unwind: { path: '$flightId_details', preserveNullAndEmptyArrays: true } }
  ]).toArray();
};

const bookTicket = async (db, booking) => {
  const { userId, flightId, bookingDate } = booking;
  if (!userId || !flightId || !bookingDate) {
    throw new Error('Missing required fields');
  }
  const flight = await db.collection('flights').findOne({ _id: flightId });
  if (!flight) {
    throw new Error('Flight not found');
  }
  const bookingCount = await db.collection('bookings').countDocuments({ flightId });
  if (flight.maxTickets && bookingCount >= flight.maxTickets) {
    throw new Error('Flight is fully booked');
  }
  const result = await db.collection('bookings').insertOne({ userId, flightId, bookingDate });
  return { _id: result.insertedId, ...booking };
};

const deleteBooking = async (db, id) => {
  const result = await db.collection('bookings').deleteOne({ _id: id });
  return result.deletedCount === 1;
};

module.exports = { getBookings, getUserBookings, bookTicket, deleteBooking };
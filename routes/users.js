const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  const result = await db.collection('users').findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: { name: user.name, email: user.email } },
    { returnDocument: 'after' }
  );
  res.json(result.value);
});

module.exports = router;
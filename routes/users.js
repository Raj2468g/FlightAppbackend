const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// Get all users with role 'user' (case-insensitive)
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = await db.collection('users').find({ role: { $regex: '^user$', $options: 'i' } }).toArray();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: [err.message || 'Database error'] });
  }
});

// Add a user
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { username, email, password, phone, gender, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: ['Username, email, and password are required']
      });
    }
    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      return res.status(400).json({
        error: 'Invalid username',
        details: ['Username must be 4-20 alphanumeric characters']
      });
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        details: ['Invalid email format']
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        details: ['Password must be at least 6 characters']
      });
    }
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return res.status(400).json({
        error: 'Invalid phone',
        details: ['Invalid phone number format']
      });
    }
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender',
        details: ['Gender must be male, female, or other']
      });
    }
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        details: ['Role must be user or admin']
      });
    }

    // Check for duplicates
    const existingUser = await db.collection('users').findOne({
      $or: [{ username }, { email }]
    });
    if (existingUser) {
      return res.status(400).json({
        error: 'Username or email already exists',
        details: ['Username or email already exists']
      });
    }

    // Insert user
    const user = {
      username,
      email,
      password,
      phone: phone || '',
      gender: gender || '',
      role: role || 'user',
      createdAt: new Date().toISOString()
    };
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
    res.status(201).json(user);
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Failed to add user', details: [err.message || 'Database error'] });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { username, email, password, phone, gender, role } = req.body;

    // Validate ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        details: ['Invalid user ID format']
      });
    }

    // Validation
    if (username && !/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      return res.status(400).json({
        error: 'Invalid username',
        details: ['Username must be 4-20 alphanumeric characters']
      });
    }
    if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        details: ['Invalid email format']
      });
    }
    if (password && password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        details: ['Password must be at least 6 characters']
      });
    }
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return res.status(400).json({
        error: 'Invalid phone',
        details: ['Invalid phone number format']
      });
    }
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender',
        details: ['Gender must be male, female, or other']
      });
    }
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        details: ['Role must be user or admin']
      });
    }

    // Check for duplicates
    if (username || email) {
      const existingUser = await db.collection('users').findOne({
        $or: [{ username }, { email }],
        _id: { $ne: new ObjectId(id) }
      });
      if (existingUser) {
        return res.status(400).json({
          error: 'Username or email already exists',
          details: ['Username or email already exists']
        });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (role) updateData.role = role;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({
        error: 'User not found',
        details: ['User not found']
      });
    }
    res.json(result.value);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user', details: [err.message || 'Database error'] });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    // Validate ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        details: ['Invalid user ID format']
      });
    }

    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'User not found',
        details: ['User not found']
      });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user', details: [err.message || 'Database error'] });
  }
});

module.exports = router;
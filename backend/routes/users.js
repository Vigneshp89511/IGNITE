const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/users - list all users in company (admin/manager)
router.get('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find({ company: req.user.company._id })
      .populate('manager', 'name email role')
      .select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users - admin creates employee/manager
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, managerId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, role required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      company: req.user.company._id,
      manager: managerId || null,
    });

    await user.populate('manager', 'name email role');
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id - admin updates user (role, manager, active)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { role, managerId, isActive, name } = req.body;
    const user = await User.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (role) user.role = role;
    if (managerId !== undefined) user.manager = managerId || null;
    if (isActive !== undefined) user.isActive = isActive;
    if (name) user.name = name;

    await user.save();
    await user.populate('manager', 'name email role');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id - admin deactivates user
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = false;
    await user.save();
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'secret_quest_key';

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password, class: userClass, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Hero already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            password: hashedPassword,
            class: userClass,
            role: role || 'USER' // allow passing role from frontend (insecure for real app, ok for demo)
        });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);

        res.status(201).json({ token, user: { id: user.id, username: user.username, class: user.class, role: user.role, xp: user.xp, level: user.level } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
        res.json({ token, user: { id: user.id, username: user.username, class: user.class, role: user.role, xp: user.xp, level: user.level } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (Admin helper for dropdown)
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'username', 'class'] });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

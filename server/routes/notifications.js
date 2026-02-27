const express = require('express');
const { Notification } = require('../models');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user (latest 50)
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all notifications as read for current user
router.put('/read', verifyToken, async (req, res) => {
    try {
        await Notification.update(
            { read: true },
            { where: { userId: req.user.id, read: false } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear all notifications for current user
router.delete('/', verifyToken, async (req, res) => {
    try {
        await Notification.destroy({ where: { userId: req.user.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

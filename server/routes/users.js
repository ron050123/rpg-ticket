const express = require('express');
const { User, Notification } = require('../models');
const router = express.Router();

// Exchange XP for items
router.post('/exchange', async (req, res) => {
    try {
        const { userId, item, cost } = req.body;

        if (!userId || !item || !cost) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.xp < cost) {
            return res.status(400).json({ error: 'Not enough XP' });
        }

        user.xp -= cost;
        await user.save();

        // Notify admins via socket
        if (req.io) {
            req.io.emit('reward_redeemed', {
                username: user.username,
                item: item,
                cost: cost,
                timestamp: new Date()
            });
        }

        // Persist notification for all admins
        const admins = await User.findAll({ where: { role: 'ADMIN' } });
        for (const admin of admins) {
            await Notification.create({
                message: `🎁 ${user.username} redeemed ${item} for ${cost} XP`,
                type: 'reward',
                userId: admin.id
            });
        }

        res.json({ success: true, newXP: user.xp, message: `Successfully exchanged ${cost} XP for ${item}` });
    } catch (error) {
        console.error('Exchange error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;


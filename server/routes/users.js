const express = require('express');
const { User, Task, Notification } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { fn, col } = require('sequelize');
const router = express.Router();

// GET /stats — user profile stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const questsDone = await Task.count({
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
            where: { status: 'DONE' }
        });
        const questsInProgress = await Task.count({
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
            where: { status: 'IN_PROGRESS' }
        });

        // Sum boss_damage from completed tasks where user is assigned
        const damageResult = await Task.sum('boss_damage', {
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
            where: { status: 'DONE' }
        });

        // Sum xp_reward from completed tasks
        const xpResult = await Task.sum('xp_reward', {
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
            where: { status: 'DONE' }
        });

        res.json({
            questsDone: questsDone || 0,
            questsInProgress: questsInProgress || 0,
            totalDamage: damageResult || 0,
            totalXpEarned: xpResult || 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

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


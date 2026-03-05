const express = require('express');
const { User, Task } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { fn, col, literal } = require('sequelize');

const router = express.Router();

// GET /api/leaderboard — ranked list of users by level/xp
router.get('/', verifyToken, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                'id', 'username', 'class', 'level', 'xp',
                [literal(`(SELECT COUNT(*) FROM UserTasks AS ut 
                    INNER JOIN Tasks AS t ON ut.TaskId = t.id 
                    WHERE ut.UserId = "User"."id" AND t.status = 'DONE')`), 'questCount']
            ],
            where: { role: 'USER' },
            order: [['level', 'DESC'], ['xp', 'DESC']]
        });

        res.json(users.map(u => ({
            id: u.id,
            username: u.username,
            class: u.class,
            level: u.level,
            xp: u.xp,
            questCount: u.getDataValue('questCount') || 0
        })));
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

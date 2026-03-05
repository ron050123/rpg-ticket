const express = require('express');
const { User, Task, Achievement, UserAchievement, Boss } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');

const router = express.Router();

// Seed achievements on first load
const ACHIEVEMENTS = [
    { key: 'first_blood', name: 'First Blood', description: 'Complete your first quest', icon: '🩸' },
    { key: 'veteran', name: 'Veteran', description: 'Complete 10 quests', icon: '🎖️' },
    { key: 'boss_slayer', name: 'Boss Slayer', description: 'Help defeat a boss', icon: '💀' },
    { key: 'bug_hunter', name: 'Bug Hunter', description: 'Complete 5 BUG quests', icon: '🐛' },
    { key: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '⭐' },
    { key: 'level_10', name: 'Legendary', description: 'Reach Level 10', icon: '🌟' },
    { key: 'team_player', name: 'Team Player', description: 'Be assigned to 5+ quests', icon: '🤝' }
];

const seedAchievements = async () => {
    for (const a of ACHIEVEMENTS) {
        await Achievement.findOrCreate({ where: { key: a.key }, defaults: a });
    }
};

// GET /api/achievements — list all with user's unlock status
router.get('/', verifyToken, async (req, res) => {
    try {
        await seedAchievements();
        const achievements = await Achievement.findAll();
        const unlocked = await UserAchievement.findAll({
            where: { userId: req.user.id }
        });
        const unlockedIds = new Set(unlocked.map(ua => ua.achievementId));

        res.json(achievements.map(a => ({
            id: a.id,
            key: a.key,
            name: a.name,
            description: a.description,
            icon: a.icon,
            unlocked: unlockedIds.has(a.id),
            unlockedAt: unlocked.find(ua => ua.achievementId === a.id)?.unlockedAt || null
        })));
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check and unlock achievements for a user
const checkAchievements = async (userId, io) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) return;

        await seedAchievements();
        const allAchievements = await Achievement.findAll();
        const alreadyUnlocked = await UserAchievement.findAll({ where: { userId } });
        const unlockedKeys = new Set(alreadyUnlocked.map(ua => {
            const ach = allAchievements.find(a => a.id === ua.achievementId);
            return ach?.key;
        }));

        // Count completed quests for this user
        const completedCount = await Task.count({
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
            where: { status: 'DONE' }
        });

        // Count BUG quests completed
        const bugCount = await Task.count({
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
            where: { status: 'DONE', label: 'BUG' }
        });

        // Count total assigned
        const assignedCount = await Task.count({
            include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }]
        });

        const checks = [
            { key: 'first_blood', condition: completedCount >= 1 },
            { key: 'veteran', condition: completedCount >= 10 },
            { key: 'bug_hunter', condition: bugCount >= 5 },
            { key: 'level_5', condition: user.level >= 5 },
            { key: 'level_10', condition: user.level >= 10 },
            { key: 'team_player', condition: assignedCount >= 5 }
        ];

        // boss_slayer: check if user contributed to a defeated boss
        const defeatedBoss = await Boss.findOne({ where: { current_hp: 0 } });
        if (defeatedBoss) {
            const contributed = await Task.count({
                include: [{ model: User, as: 'Assignees', where: { id: userId }, attributes: [] }],
                where: { boss_id: defeatedBoss.id, status: 'DONE' }
            });
            checks.push({ key: 'boss_slayer', condition: contributed > 0 });
        }

        const newlyUnlocked = [];
        for (const { key, condition } of checks) {
            if (condition && !unlockedKeys.has(key)) {
                const ach = allAchievements.find(a => a.key === key);
                if (ach) {
                    await UserAchievement.create({ userId, achievementId: ach.id });
                    newlyUnlocked.push(ach);
                }
            }
        }

        if (newlyUnlocked.length > 0 && io) {
            io.emit('achievement_unlocked', {
                userId,
                achievements: newlyUnlocked.map(a => ({ name: a.name, icon: a.icon }))
            });
        }
    } catch (error) {
        console.error('Achievement check error:', error);
    }
};

module.exports = router;
module.exports.checkAchievements = checkAchievements;

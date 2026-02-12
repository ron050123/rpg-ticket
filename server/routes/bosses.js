const express = require('express');
const { Boss, Task, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get All Bosses (Public)
router.get('/', async (req, res) => {
    try {
        const bosses = await Boss.findAll({ order: [['start_date', 'ASC'], ['createdAt', 'ASC']] });
        res.json(bosses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Active Boss (Public)
router.get('/active', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        // Find boss where today is between start and deadline, or just the latest one if no dates
        // For simplicity, let's pick the first one that is "in progress" (start <= today <= deadline)
        // If none, pick the latest created one.

        const { Op } = require('sequelize');

        // Try strict active first
        let boss = await Boss.findOne({
            where: {
                start_date: { [Op.lte]: today },
                deadline: { [Op.gte]: today }
            },
            order: [['createdAt', 'DESC']]
        });

        // Fallback: Latest created if no dates or no match ?? 
        // Or maybe just show the latest created one regardless?
        // Let's stick to "Latest Created" as fallback if no specific active window found to avoid empty screen.
        if (!boss) {
            boss = await Boss.findOne({ order: [['createdAt', 'DESC']] });
        }

        if (!boss) return res.status(404).json({ message: 'No active Boss' });
        res.json(boss);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Boss (Admin Only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, image_url, tasks, start_date, deadline } = req.body;

        // Calculate initial HP from tasks
        let calculatedHp = 0;
        if (tasks && Array.isArray(tasks)) {
            calculatedHp = tasks.reduce((sum, t) => sum + (parseInt(t.boss_damage) || 0), 0);
        }

        if (calculatedHp <= 0) {
            return res.status(400).json({ message: 'Boss must have at least one quest with damage > 0 to determine Total HP.' });
        }

        const boss = await Boss.create({
            name,
            total_hp: calculatedHp,
            current_hp: calculatedHp,
            image_url,
            start_date,
            deadline
        });

        if (tasks && Array.isArray(tasks) && tasks.length > 0) {
            // Sequential creation to handle associations
            for (const t of tasks) {
                const newTask = await Task.create({
                    title: t.title,
                    difficulty: 10, // Default difficulty
                    priority: t.priority || 'MEDIUM',
                    label: t.label || 'FEATURE',
                    description: t.description || '',
                    boss_id: boss.id,
                    xp_reward: parseInt(t.xp_reward) || 0,
                    boss_damage: parseInt(t.boss_damage) || 0,
                    deadline: t.deadline || null
                });

                if (t.assignee_ids && Array.isArray(t.assignee_ids) && t.assignee_ids.length > 0) {
                    const users = await User.findAll({ where: { id: t.assignee_ids } });
                    await newTask.setAssignees(users);
                }
            }
        }

        // Fetch complete boss with tasks for emit
        const completeBoss = await Boss.findByPk(boss.id);
        req.io.emit('boss_created', completeBoss);

        // Also emit tasks created
        const tasksWithUsers = await Task.findAll({ where: { boss_id: boss.id }, include: [{ model: User, as: 'Assignees' }] });
        tasksWithUsers.forEach(t => req.io.emit('task_created', t));

        res.status(201).json(completeBoss);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Boss (Admin Only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { name, total_hp, current_hp, image_url, start_date, deadline } = req.body;
        const boss = await Boss.findByPk(req.params.id);

        if (!boss) return res.status(404).json({ message: 'Boss not found' });

        if (name !== undefined) boss.name = name;
        if (total_hp !== undefined) boss.total_hp = total_hp;
        if (current_hp !== undefined) boss.current_hp = current_hp;
        if (image_url !== undefined) boss.image_url = image_url;
        if (start_date !== undefined) boss.start_date = start_date;
        if (deadline !== undefined) boss.deadline = deadline;

        await boss.save();
        req.io.emit('boss_updated', boss);
        res.json(boss);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Boss (Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const boss = await Boss.findByPk(req.params.id);
        if (!boss) {
            return res.status(404).json({ message: 'Boss not found' });
        }

        // Manually decoupling tasks to avoid SQLITE_CONSTRAINT error
        await Task.update({ boss_id: null }, { where: { boss_id: boss.id } });

        // Check for 'Tasks_backup' or similar tables created by Sequelize sync failures causing FK constraints
        try {
            const { sequelize } = require('../models');
            await sequelize.query(`UPDATE Tasks_backup SET boss_id = NULL WHERE boss_id = ${boss.id}`);
        } catch (e) {
            // Ignore if table doesn't exist
        }

        await boss.destroy();

        req.io.emit('boss_deleted', { id: boss.id }); // Send object with ID for consistency
        res.json({ message: 'Boss deleted successfully' });
    } catch (error) {
        console.error('Delete boss error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

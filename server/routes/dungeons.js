const express = require('express');
const { Task, Boss, User, Notification } = require('../models');
const { requireAdmin, verifyToken } = require('../middleware/auth');
const router = express.Router();

// Mock AI splitting logic
// In a real app, this would call OpenAI or Gemini API
const splitMarkdownIntoTasks = (markdown) => {
    const lines = markdown.split('\n');
    const tasks = [];
    let currentTask = null;

    lines.forEach(line => {
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('- [ ] ')) {
            if (currentTask) tasks.push(currentTask);
            currentTask = {
                title: line.replace('### ', '').replace('## ', '').replace('- [ ] ', '').trim(),
                description: '',
                difficulty: 5,
                priority: 'MEDIUM',
                label: 'FEATURE'
            };
        } else if (currentTask && line.trim()) {
            currentTask.description += line.trim() + ' ';
        }
    });
    if (currentTask) tasks.push(currentTask);

    // AI "Magic": Enhance difficulty and labels based on keywords
    const creepVisuals = ['slime', 'skeleton', 'orc', 'ghost', 'goblin'];
    return tasks.map(t => {
        const lowerTitle = t.title.toLowerCase();
        t.creep_visual = creepVisuals[Math.floor(Math.random() * creepVisuals.length)];
        if (lowerTitle.includes('fix') || lowerTitle.includes('bug')) {
            t.label = 'BUG';
            t.difficulty = 3;
            t.creep_visual = 'slime'; // Bugs are like slimes
        } else if (lowerTitle.includes('refactor') || lowerTitle.includes('optim')) {
            t.label = 'REFACTOR';
            t.difficulty = 8;
            t.creep_visual = 'ghost'; // Ghosts are hard to find/refactor
        } else if (lowerTitle.includes('critical') || lowerTitle.includes('urgent')) {
            t.priority = 'HIGH';
            t.creep_visual = 'orc'; // Stronger creep
        }
        return t;
    });
};

// Auto-assignment logic
const autoAssignTasks = async (tasks, users) => {
    // Sort users by level (ascending) to give easier tasks to lower levels
    const sortedUsers = [...users].sort((a, b) => a.level - b.level);
    
    return tasks.map(task => {
        let bestUser = null;

        // Simple heuristic assignment
        if (task.label === 'BUG') {
            // Rogues are good for bugs
            bestUser = sortedUsers.find(u => u.class === 'Rogue') || sortedUsers[0];
        } else if (task.difficulty > 7) {
            // High level warriors/mages for hard tasks
            bestUser = [...sortedUsers].reverse().find(u => u.class === 'Warrior' || u.class === 'Mage') || sortedUsers[sortedUsers.length - 1];
        } else {
            bestUser = sortedUsers[Math.floor(Math.random() * sortedUsers.length)];
        }

        return { ...task, assignee_ids: [bestUser.id], lead_assignee: bestUser.id };
    });
};

// POST /api/dungeons/forge - AI Forge a project into tasks
router.post('/forge', requireAdmin, async (req, res) => {
    try {
        const { markdownGuide, bossId } = req.body;

        if (!markdownGuide || !bossId) {
            return res.status(400).json({ error: 'Missing markdownGuide or bossId' });
        }

        const boss = await Boss.findByPk(bossId);
        if (!boss) return res.status(404).json({ error: 'Boss (Dungeon) not found' });

        // 1. AI Analysis & Splitting
        const rawTasks = splitMarkdownIntoTasks(markdownGuide);

        // 2. Fetch all users for assignment
        const users = await User.findAll({ where: { role: 'USER' } });
        if (users.length === 0) {
            return res.status(400).json({ error: 'No users available for assignment.' });
        }

        // 3. Auto-Assignment
        const assignedTasks = await autoAssignTasks(rawTasks, users);

        // 4. Create tasks in database
        const createdTasks = [];
        for (const t of assignedTasks) {
            const task = await Task.create({
                title: t.title,
                description: t.description,
                difficulty: t.difficulty,
                priority: t.priority,
                label: t.label,
                boss_id: bossId,
                assigned_to: t.lead_assignee,
                xp_reward: t.difficulty * 10,
                boss_damage: t.difficulty * 5,
                creep_visual: t.creep_visual
            });
            
            if (t.assignee_ids) {
                await task.addAssignees(t.assignee_ids);
            }

            // Update Boss HP
            boss.total_hp += task.boss_damage;
            boss.current_hp += task.boss_damage;

            createdTasks.push(task);
        }

        await boss.save();
        if (req.io) {
            req.io.emit('boss_updated', boss);
            req.io.emit('tasks_forged', { count: createdTasks.length });
        }

        res.json({
            message: `Successfully forged ${createdTasks.length} tasks from markdown.`,
            tasks: createdTasks,
            boss
        });

    } catch (error) {
        console.error('Forge error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
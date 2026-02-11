const express = require('express');
const { Task, Boss, User } = require('../models');
const { requireAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get all tasks (Filtered by visibility)
router.get('/', verifyToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const userId = req.user.id;

        let tasks;

        if (isAdmin) {
            // Admins see all tasks
            tasks = await Task.findAll({
                where: { parent_task_id: null },
                attributes: { include: ['assigned_to'] }, // Include lead assignee
                include: [
                    { model: User, as: 'Assignees' },
                    { model: User, as: 'AdminReplier', required: false }, // Admin who wrote reply
                    {
                        model: Task,
                        as: 'SubTasks',
                        include: [{ model: User, as: 'Assignees' }]
                    }
                ]
            });
        } else {
            // Regular users see only:
            // 1. Tasks they're assigned to
            // 2. Public tasks
            const { Op } = require('sequelize');

            tasks = await Task.findAll({
                where: {
                    parent_task_id: null,
                    [Op.or]: [
                        { is_public: true },
                        { '$Assignees.id$': userId }
                    ]
                },
                attributes: { include: ['assigned_to'] }, // Include lead assignee
                include: [
                    { model: User, as: 'Assignees', required: false },
                    { model: User, as: 'AdminReplier', required: false }, // Admin who wrote reply
                    {
                        model: Task,
                        as: 'SubTasks',
                        required: false,
                        include: [{ model: User, as: 'Assignees', required: false }]
                    }
                ]
            });
        }

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Task (Admin Only for main quests, Lead Assignee can create side quests)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, difficulty, priority, label, boss_id, assignee_ids, parent_task_id, xp_reward, boss_damage, description, deadline } = req.body;

        // Permission check: Only admin can create main quests, lead assignees can create side quests
        if (!parent_task_id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can create main quests.' });
        }

        // If creating a side quest, verify the user is either admin or lead assignee of parent
        if (parent_task_id) {
            const parent = await Task.findByPk(parent_task_id);
            if (!parent) {
                return res.status(404).json({ error: 'Parent task not found.' });
            }
            const isAdmin = req.user.role === 'ADMIN';
            const isLeadAssignee = parent.assigned_to === req.user.id;
            if (!isAdmin && !isLeadAssignee) {
                return res.status(403).json({ error: 'Only admin or lead assignee can create side quests.' });
            }
        }

        // Resolve Boss ID if subtask
        let finalBossId = boss_id;
        if (parent_task_id && !finalBossId) {
            const parent = await Task.findByPk(parent_task_id);
            if (parent) finalBossId = parent.boss_id;
        }

        // Set lead assignee (first assignee in the list)
        const leadAssigneeId = assignee_ids && assignee_ids.length > 0 ? assignee_ids[0] : null;

        const task = await Task.create({
            title,
            difficulty, // Keep for legacy or general "size"
            priority,
            label,
            boss_id: finalBossId,
            parent_task_id,
            xp_reward: parent_task_id ? (xp_reward || 10) : 0, // Main quests 0 XP, Subtasks default 10
            boss_damage: boss_damage || 10,
            description: description || null,
            deadline: deadline || null,
            assigned_to: leadAssigneeId // Lead assignee
        });

        if (assignee_ids && assignee_ids.length > 0) {
            await task.addAssignees(assignee_ids);
        }

        // Update Boss HP if attached
        // ONLY for main quests (side quests don't affect boss HP)
        if (finalBossId && !parent_task_id) {
            const boss = await Boss.findByPk(finalBossId);
            if (boss) {
                boss.total_hp += (task.boss_damage || 10);
                boss.current_hp += (task.boss_damage || 10);
                await boss.save();
                req.io.emit('boss_updated', boss);
            }
        }

        // Fetch refreshed task
        const taskWithUsers = await Task.findByPk(task.id, {
            include: [{ model: User, as: 'Assignees' }, { model: Task, as: 'SubTasks', include: [{ model: User, as: 'Assignees' }] }]
        });

        // Notify
        if (parent_task_id) {
            const parent = await Task.findByPk(parent_task_id, {
                include: [{ model: User, as: 'Assignees' }, { model: Task, as: 'SubTasks', include: [{ model: User, as: 'Assignees' }] }]
            });
            req.io.emit('task_updated', parent);
        } else {
            req.io.emit('task_created', taskWithUsers);
        }

        res.status(201).json(taskWithUsers);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Task
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { status, assignee_ids, xp_reward, boss_damage, completion_comment, is_public, priority, label, title, description, deadline, admin_reply } = req.body;
        const task = await Task.findByPk(req.params.id, { include: [{ model: User, as: 'Assignees' }] });

        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Permission Check
        const isAssignee = task.Assignees.some(u => u.id === req.user.id);
        const isAdmin = req.user.role === 'ADMIN';
        const isLeadAssignee = task.assigned_to === req.user.id; // Lead assignee check

        if (!isAdmin) {
            if (!isAssignee) {
                return res.status(403).json({ message: 'You can only update your own quests.' });
            }
            // Lead assignee can manage assignees but not other fields
            if (isLeadAssignee && assignee_ids) {
                // Allow lead assignee to manage assignees only
            } else if (assignee_ids) {
                return res.status(403).json({ message: 'You cannot reassign quests.' });
            }
            // Non-admins cannot set status to DONE directly
            if (status === 'DONE') {
                return res.status(403).json({ message: 'Only Admins can Complete quests. Please Mark as Done to submit for review.' });
            }
        }

        const oldStatus = task.status;

        // Update fields
        if (status) {
            // If transitioning to PENDING_REVIEW, require a comment (optional but good practice to enforce if UI supports it)
            if (status === 'PENDING_REVIEW' && !completion_comment && !task.completion_comment) {
                // We could enforce it here, but let's be flexible for now or enforce on FE
            }
            task.status = status;
        }
        if (completion_comment !== undefined) task.completion_comment = completion_comment;
        if (xp_reward !== undefined && isAdmin) task.xp_reward = xp_reward;
        if (boss_damage !== undefined && isAdmin) task.boss_damage = boss_damage;

        // Add updateable fields for admin edit
        if (is_public !== undefined && isAdmin) task.is_public = is_public;
        if (priority !== undefined && isAdmin) task.priority = priority;
        if (label !== undefined && isAdmin) task.label = label;
        if (title !== undefined && isAdmin) task.title = title;
        if (description !== undefined && isAdmin) task.description = description;
        if (deadline !== undefined && isAdmin) task.deadline = deadline;
        if (admin_reply !== undefined && isAdmin) {
            task.admin_reply = admin_reply;
            task.admin_reply_by = req.user.id; // Track who wrote the reply
        }

        await task.save();

        if (isAdmin && assignee_ids) {
            // Check for new assignees to trigger "Friend Joined" notification
            const oldAssigneeIds = task.Assignees.map(u => u.id);
            const newAssigneeIds = assignee_ids.map(id => parseInt(id));

            // If we are adding new people
            const addedIds = newAssigneeIds.filter(id => !oldAssigneeIds.includes(id));

            if (addedIds.length > 0 && oldAssigneeIds.length > 0) {
                // Notify existing users that a friend has joined
                req.io.emit('friend_joined', {
                    taskId: task.id,
                    taskTitle: task.title,
                    newAssigneeCount: addedIds.length
                });
            }

            await task.setAssignees(assignee_ids);
        }

        // Damage & XP Logic (Transitioning to DONE)
        // This block runs when an ADMIN moves a task to DONE (approving it)
        if (oldStatus !== 'DONE' && status === 'DONE') {
            const currentAssignees = await task.getAssignees();

            // 1. Deal Damage to Boss (ONLY Main Quests, not side quests)
            // Side quests award XP but don't damage the boss
            if (task.boss_id && task.boss_damage > 0 && !task.parent_task_id) {
                const boss = await Boss.findByPk(task.boss_id);
                if (boss) {
                    let damage = task.boss_damage;
                    let multiplier = 1.0;

                    // Calculate max multiplier from any assignee
                    for (const user of currentAssignees) {
                        if (user.class === 'Warrior' && task.priority === 'HIGH') multiplier = Math.max(multiplier, 1.5);
                        if (user.class === 'Rogue' && task.label === 'BUG') multiplier = Math.max(multiplier, 2.0);
                    }

                    const finalDamage = Math.floor(damage * multiplier);
                    boss.current_hp = Math.max(0, boss.current_hp - finalDamage);
                    await boss.save();

                    req.io.emit('boss_updated', boss);
                    req.io.emit('damage_dealt', { damage: finalDamage, taskId: task.id, bossId: boss.id });
                }
            }

            // 2. Award XP to ALL Assignees
            // Fix: Ensure we use the task's xp_reward (which might be 0 for main quests)
            if (task.xp_reward > 0) {
                for (const user of currentAssignees) {
                    let xpGain = task.xp_reward;
                    if (user.class === 'Cleric') xpGain = Math.floor(xpGain * 1.2);

                    user.xp += xpGain;
                    // Level up logic (simple)
                    if (user.xp >= user.level * 100) {
                        user.level += 1;
                        user.xp = user.xp - (user.level - 1) * 100; // Carry over overflow? Or just reset? Let's keep simple
                    }
                    await user.save();
                }
            }
        }

        // Emit Update
        const finalTask = await Task.findByPk(task.id, {
            include: [{ model: User, as: 'Assignees' }, { model: Task, as: 'SubTasks', include: [{ model: User, as: 'Assignees' }] }]
        });

        if (task.parent_task_id) {
            const parent = await Task.findByPk(task.parent_task_id, {
                include: [{ model: User, as: 'Assignees' }, { model: Task, as: 'SubTasks', include: [{ model: User, as: 'Assignees' }] }]
            });
            req.io.emit('task_updated', parent);
        } else {
            req.io.emit('task_updated', finalTask);
        }

        res.json(finalTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a task (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await Task.findByPk(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // If the task has a boss, reduce the boss HP
        // ONLY for main quests (side quests don't affect boss HP)
        if (task.boss_id && task.boss_damage > 0 && !task.parent_task_id) {
            const boss = await Boss.findByPk(task.boss_id);
            if (boss) {
                boss.total_hp = Math.max(0, boss.total_hp - task.boss_damage);
                boss.current_hp = Math.max(0, boss.current_hp - task.boss_damage);
                await boss.save();
                req.io.emit('boss_updated', boss);
            }
        }

        // Delete subtasks first if this is a parent task
        if (!task.parent_task_id) {
            await Task.destroy({ where: { parent_task_id: taskId } });
        }

        // Delete the task
        await task.destroy();

        // Emit deletion event
        req.io.emit('task_deleted', { taskId });

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

const express = require('express');
const { Comment, User, Task } = require('../models');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get comments for a task
router.get('/:taskId', verifyToken, async (req, res) => {
    try {
        const comments = await Comment.findAll({
            where: { taskId: req.params.taskId },
            include: [{ model: User, attributes: ['id', 'username', 'class'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a comment
router.post('/:taskId', verifyToken, async (req, res) => {
    try {
        const { content } = req.body;
        const taskId = req.params.taskId;
        const userId = req.user.id;

        if (!content) return res.status(400).json({ error: 'Content is required' });

        const comment = await Comment.create({
            content,
            taskId,
            userId
        });

        const commentWithUser = await Comment.findByPk(comment.id, {
            include: [{ model: User, attributes: ['id', 'username', 'class'] }]
        });

        res.status(201).json(commentWithUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

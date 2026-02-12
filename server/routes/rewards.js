const express = require('express');
const { Reward } = require('../models');
const router = express.Router();

// Get all rewards
router.get('/', async (req, res) => {
    try {
        const rewards = await Reward.findAll();
        res.json(rewards);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new reward
router.post('/', async (req, res) => {
    try {
        const { name, cost, description, image_url } = req.body;
        if (!name || cost === undefined) {
            return res.status(400).json({ error: 'Name and cost are required' });
        }
        const reward = await Reward.create({ name, cost, description, image_url });
        res.json(reward);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a reward
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cost, description, image_url } = req.body;
        const reward = await Reward.findByPk(id);
        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        await reward.update({ name, cost, description, image_url });
        res.json(reward);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a reward
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const reward = await Reward.findByPk(id);
        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        await reward.destroy();
        res.json({ message: 'Reward deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

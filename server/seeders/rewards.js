const { Reward } = require('../models');

const defaultRewards = [
    { name: 'Redbull', cost: 20, description: 'Gives you wings (and energy)', image_url: '' },
    { name: 'Coffee', cost: 30, description: 'Wake up!', image_url: '' },
    { name: 'Snacks', cost: 15, description: 'Yummy treats', image_url: '' },
    { name: 'Bao Bun', cost: 50, description: 'Steamed goodness', image_url: '' }
];

async function seedRewards() {
    try {
        const count = await Reward.count();
        if (count === 0) {
            await Reward.bulkCreate(defaultRewards);
            console.log('Default rewards seeded successfully.');
        } else {
            console.log('Rewards already exist, skipping seed.');
        }
    } catch (error) {
        console.error('Failed to seed rewards:', error);
    }
}

module.exports = seedRewards;

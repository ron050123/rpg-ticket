const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    difficulty: {
        type: DataTypes.INTEGER,
        defaultValue: 10 // Base damage/xp
    },
    status: {
        type: DataTypes.ENUM('TODO', 'IN_PROGRESS', 'PENDING_REVIEW', 'DONE'),
        defaultValue: 'TODO'
    },
    completion_comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    admin_reply: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    admin_reply_by: {
        type: DataTypes.INTEGER,
        allowNull: true // Stores the user ID of the admin who wrote the reply
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
        defaultValue: 'MEDIUM'
    },
    label: {
        type: DataTypes.ENUM('FEATURE', 'BUG', 'ENHANCEMENT'),
        defaultValue: 'FEATURE'
    },
    boss_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    xp_reward: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    boss_damage: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    creep_visual: {
        type: DataTypes.STRING,
        allowNull: true
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false 
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    deadline: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    parent_task_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

module.exports = Task;
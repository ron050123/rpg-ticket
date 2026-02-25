const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('COMMENT', 'PROOF_OF_WORK', 'APPROVAL', 'DENIAL'),
        defaultValue: 'COMMENT'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    taskId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = Comment;

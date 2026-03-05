const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAchievement = sequelize.define('UserAchievement', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    achievementId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unlockedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = UserAchievement;

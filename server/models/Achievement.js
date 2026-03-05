const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
    key: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    icon: {
        type: DataTypes.STRING,
        defaultValue: '🏅'
    }
});

module.exports = Achievement;

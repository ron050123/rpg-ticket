const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    class: {
        type: DataTypes.ENUM('Warrior', 'Mage', 'Rogue', 'Cleric', 'Grandmaster'),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('USER', 'ADMIN'),
        defaultValue: 'USER'
    },
    xp: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    level: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
});

module.exports = User;

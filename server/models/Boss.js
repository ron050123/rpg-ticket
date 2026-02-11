const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Boss = sequelize.define('Boss', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    total_hp: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    current_hp: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true // Optional for now, or default to NOW
    },
    deadline: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
});

module.exports = Boss;

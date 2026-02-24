const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Boss = require('./Boss');
const Task = require('./Task');
const Reward = require('./Reward');



const Comment = require('./Comment');

// Associations
Boss.hasMany(Task, { foreignKey: 'boss_id', onDelete: 'SET NULL' });
Task.belongsTo(Boss, { foreignKey: 'boss_id' });

User.belongsToMany(Task, { through: 'UserTasks', as: 'AssignedTasks' });
Task.belongsToMany(User, { through: 'UserTasks', as: 'Assignees' });
// Keeping legacy for now or removing if fully migrating. Let's keep for safety but primary is now Assignees.
User.hasMany(Task, { foreignKey: 'assigned_to', onDelete: 'SET NULL' });
Task.belongsTo(User, { foreignKey: 'assigned_to' });

Task.hasMany(Task, { as: 'SubTasks', foreignKey: 'parent_task_id', onDelete: 'CASCADE' });
Task.belongsTo(Task, { as: 'ParentTask', foreignKey: 'parent_task_id' });

// Association for admin who wrote the reply
Task.belongsTo(User, { as: 'AdminReplier', foreignKey: 'admin_reply_by', onDelete: 'SET NULL' });

// Comment Associations
Comment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(Task, { foreignKey: 'taskId', onDelete: 'CASCADE' });
Task.hasMany(Comment, { foreignKey: 'taskId', onDelete: 'CASCADE' });

module.exports = {
    User,
    Boss,
    Task,
    Task,
    Comment,
    Reward,
    sequelize
};

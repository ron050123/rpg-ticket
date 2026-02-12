const sequelize = require('./server/config/database');

async function inspectSchema() {
    try {
        const [results] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='Tasks'");
        console.log('Tasks Table Schema:', results[0].sql);

        const [bossResults] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='Bosses'");
        console.log('Bosses Table Schema:', bossResults[0].sql);

        // Count tasks with boss_id
        const [counts] = await sequelize.query("SELECT count(*) as count, boss_id FROM Tasks GROUP BY boss_id");
        console.log('Tasks by Boss ID:', counts);

    } catch (error) {
        console.error('Schema inspection failed:', error);
    }
}

inspectSchema();

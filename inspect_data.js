const { Boss, Task } = require('./server/models');

async function inspectData() {
    try {
        const bosses = await Boss.findAll();
        console.log('--- All Bosses ---');
        console.log(JSON.stringify(bosses, null, 2));

        const nullBossTasks = await Task.count({ where: { boss_id: null } });
        console.log(`\nTasks with boss_id = null: ${nullBossTasks}`);

        const allTasks = await Task.findAll({ attributes: ['id', 'title', 'boss_id', 'status'] });
        console.log('\n--- All Tasks Sample (Limit 5) ---');
        console.log(JSON.stringify(allTasks.slice(0, 5), null, 2));

    } catch (error) {
        console.error('Inspection failed:', error);
    }
}

inspectData();

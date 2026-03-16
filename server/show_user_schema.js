const { sequelize } = require('./models');

async function showSchema() {
    try {
        const [results] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='Users'");
        console.log(results[0].sql);
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

showSchema();
const sq = require('./config/database');

(async () => {
    try {
        await sq.query("ALTER TABLE Comments ADD COLUMN type TEXT DEFAULT 'COMMENT'");
        console.log('Added type column to Comments');
    } catch (e) {
        console.log('Column may already exist:', e.message);
    }

    const [r] = await sq.query("PRAGMA table_info('Comments')");
    console.log('Comments schema:', JSON.stringify(r, null, 2));

    process.exit(0);
})();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite');

db.serialize(() => {
    db.run("ALTER TABLE Users ADD COLUMN inventory TEXT DEFAULT '[]';", (err) => {
        if (err) {
            console.log("Column might already exist or error:", err.message);
        } else {
            console.log("Column inventory added.");
        }
    });
});

db.close();
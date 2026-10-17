const db = require('./src/config/db');

async function checkTable() {
    try {
        const [rows] = await db.execute('DESCRIBE appointments');
        rows.forEach(row => {
            console.log(`${row.Field} | ${row.Type} | ${row.Null} | ${row.Key} | ${row.Default}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTable();

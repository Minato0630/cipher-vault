const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'case_vault.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    db.exec("BEGIN TRANSACTION;");

    const columns = db.prepare("PRAGMA table_info(audit_log)").all();
    const colNames = columns.map(c => c.name);

    if (!colNames.includes('doc_id')) {
        db.exec("ALTER TABLE audit_log ADD COLUMN doc_id TEXT;");
    }
    if (!colNames.includes('result')) {
        db.exec("ALTER TABLE audit_log ADD COLUMN result TEXT;");
    }

    db.exec("COMMIT;");
    console.log("Migration successful! New SIH audit columns added.");
} catch (err) {
    db.exec("ROLLBACK;");
    console.error("Migration failed:", err);
}

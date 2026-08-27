const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'case_vault.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    db.exec("BEGIN TRANSACTION;");

    // Check if columns exist before adding
    const columns = db.prepare("PRAGMA table_info(documents)").all();
    const colNames = columns.map(c => c.name);

    if (!colNames.includes('file_size')) {
        db.exec("ALTER TABLE documents ADD COLUMN file_size INTEGER;");
    }
    if (!colNames.includes('file_hash')) {
        db.exec("ALTER TABLE documents ADD COLUMN file_hash TEXT;");
    }
    if (!colNames.includes('legal_hold')) {
        db.exec("ALTER TABLE documents ADD COLUMN legal_hold BOOLEAN DEFAULT 0;");
    }
    if (!colNames.includes('ocr_status')) {
        db.exec("ALTER TABLE documents ADD COLUMN ocr_status TEXT DEFAULT 'pending';");
    }
    if (!colNames.includes('ocr_text')) {
        db.exec("ALTER TABLE documents ADD COLUMN ocr_text TEXT;");
    }
    if (!colNames.includes('ai_classification')) {
        db.exec("ALTER TABLE documents ADD COLUMN ai_classification TEXT;");
    }
    if (!colNames.includes('ai_entities')) {
        db.exec("ALTER TABLE documents ADD COLUMN ai_entities TEXT;");
    }

    db.exec("COMMIT;");
    console.log("Migration successful! New SIH metadata columns added.");
} catch (err) {
    db.exec("ROLLBACK;");
    console.error("Migration failed:", err);
}

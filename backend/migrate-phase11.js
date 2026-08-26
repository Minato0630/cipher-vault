const db = require('./db');

try {
    db.exec('ALTER TABLE anchors ADD COLUMN last_anchored_log_id INTEGER');
    console.log('Added last_anchored_log_id column to anchors table.');

    // Backfill existing anchors
    const anchors = db.prepare('SELECT id, case_id, timestamp FROM anchors').all();
    const updateAnchor = db.prepare('UPDATE anchors SET last_anchored_log_id = ? WHERE id = ?');
    
    let backfilled = 0;
    for (const anchor of anchors) {
        // Find max audit_log id with timestamp <= anchor's timestamp
        const log = db.prepare('SELECT MAX(id) as maxId FROM audit_log WHERE case_id = ? AND timestamp <= ?').get(anchor.case_id, anchor.timestamp);
        if (log && log.maxId) {
            updateAnchor.run(log.maxId, anchor.id);
            backfilled++;
        } else {
            // Fallback for anchors with no preceding logs (shouldn't happen)
            updateAnchor.run(0, anchor.id);
        }
    }
    console.log(`Backfill complete. Updated ${backfilled} anchor(s).`);
} catch (e) {
    if (e.message.includes('duplicate column name')) {
        console.log('Column last_anchored_log_id already exists.');
    } else {
        console.error('Migration failed:', e);
    }
}

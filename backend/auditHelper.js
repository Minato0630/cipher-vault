const db = require('./db');
const crypto = require('crypto');

// The genesis hash used for the very first log entry of a case
const GENESIS_HASH = "GENESIS";

const auditHelper = {
    // Inserts a new audit log entry.
    // This is wrapped in an IMMEDIATE transaction to prevent concurrent forks.
    logAction: db.transaction((caseId, actorId, action, docId = null, result = 'success') => {
        // Find the previous entry for this case
        const stmt = db.prepare('SELECT entry_hash FROM audit_log WHERE case_id = ? ORDER BY id DESC LIMIT 1');
        const lastEntry = stmt.get(caseId);
        
        const prev_hash = lastEntry ? lastEntry.entry_hash : GENESIS_HASH;
        const timestamp = new Date().toISOString();
        
        // Compute entry_hash = SHA-256(prev_hash + actor_id + action + timestamp + case_id + doc_id + result)
        const payload = prev_hash + actorId + action + timestamp + caseId + (docId || '') + (result || '');
        const entry_hash = crypto.createHash('sha256').update(payload).digest('hex');
        
        const insertStmt = db.prepare(`
            INSERT INTO audit_log (case_id, actor_id, action, timestamp, prev_hash, entry_hash, doc_id, result) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(caseId, actorId, action, timestamp, prev_hash, entry_hash, docId, result);
    }).immediate(), // Lock immediately to prevent concurrent reads of the same prev_hash
    
    GENESIS_HASH
};

module.exports = auditHelper;

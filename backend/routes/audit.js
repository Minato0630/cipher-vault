const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// Check membership middleware
const checkMember = (req, res, next) => {
    const caseId = req.params.id;
    const checkRole = db.prepare('SELECT role FROM case_members WHERE case_id = ? AND user_id = ?');
    const userRole = checkRole.get(caseId, req.user.id);
    if (!userRole) {
        return res.status(403).json({ error: 'Unauthorized: Not a member of this case' });
    }
    next();
};

// GET /cases/:id/audit-log
router.get('/', checkMember, (req, res) => {
    const caseId = req.params.id;
    const docId = req.query.docId;

    let stmt;
    let logs;

    if (docId) {
        stmt = db.prepare('SELECT * FROM audit_log WHERE case_id = ? AND doc_id = ? ORDER BY id ASC');
        logs = stmt.all(caseId, docId);
    } else {
        stmt = db.prepare('SELECT * FROM audit_log WHERE case_id = ? ORDER BY id ASC');
        logs = stmt.all(caseId);
    }

    res.json(logs);
});

// GET /cases/:id/audit-log/verify
router.get('/verify', checkMember, (req, res) => {
    const caseId = req.params.id;
    const stmt = db.prepare('SELECT * FROM audit_log WHERE case_id = ? ORDER BY id ASC');
    const logs = stmt.all(caseId);

    const crypto = require('crypto');
    let expectedPrevHash = 'GENESIS';
    let brokenAt = null;

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.prev_hash !== expectedPrevHash) {
            brokenAt = log.id;
            break;
        }

        const payload = log.prev_hash + log.actor_id + log.action + log.timestamp + log.case_id;
        const computedHash = crypto.createHash('sha256').update(payload).digest('hex');

        if (log.entry_hash !== computedHash) {
            brokenAt = log.id;
            break;
        }

        expectedPrevHash = computedHash;
    }

    if (brokenAt) {
        res.json({ intact: false, broken_at_id: brokenAt });
    } else {
        res.json({ intact: true, entries: logs.length });
    }
});

// POST /cases/:id/audit-log/anchor
router.post('/anchor', checkMember, async (req, res) => {
    const caseId = req.params.id;
    
    // RBAC: Only investigating_officer or supervising_officer can trigger an anchor
    const checkRole = db.prepare('SELECT role FROM case_members WHERE case_id = ? AND user_id = ?');
    const userRole = checkRole.get(caseId, req.user.id);
    if (!userRole || (userRole.role !== 'investigating_officer' && userRole.role !== 'supervising_officer')) {
        return res.status(403).json({ error: 'Only investigating_officer or supervising_officer can trigger an anchor' });
    }

    try {
        const lastAnchorStmt = db.prepare('SELECT * FROM anchors WHERE case_id = ? ORDER BY id DESC LIMIT 1');
        const lastAnchor = lastAnchorStmt.get(caseId);
        
        let logsStmt;
        let logs;
        if (lastAnchor && lastAnchor.last_anchored_log_id != null) {
            logsStmt = db.prepare('SELECT id, entry_hash FROM audit_log WHERE case_id = ? AND id > ? ORDER BY id ASC');
            logs = logsStmt.all(caseId, lastAnchor.last_anchored_log_id);
        } else if (lastAnchor) {
            // Fallback for anchors created before the migration where last_anchored_log_id might be missing
            logsStmt = db.prepare('SELECT id, entry_hash FROM audit_log WHERE case_id = ? AND timestamp > ? ORDER BY id ASC');
            logs = logsStmt.all(caseId, lastAnchor.timestamp);
        } else {
            logsStmt = db.prepare('SELECT id, entry_hash FROM audit_log WHERE case_id = ? ORDER BY id ASC');
            logs = logsStmt.all(caseId);
        }

        if (logs.length === 0) {
            return res.json({ message: "No new logs to anchor", anchored: false });
        }

        const hashes = logs.map(l => l.entry_hash);
        const maxLogId = Math.max(...logs.map(l => l.id));
        
        const blockchain = require('../blockchain');
        const result = await blockchain.anchorCaseLogs(caseId, hashes);

        const insertAnchor = db.prepare('INSERT INTO anchors (case_id, tx_hash, merkle_root, timestamp, last_anchored_log_id) VALUES (?, ?, ?, ?, ?)');
        insertAnchor.run(caseId, result.txHash, result.merkleRoot, result.timestamp, maxLogId);

        res.json({
            anchored: true,
            txHash: result.txHash,
            merkleRoot: result.merkleRoot,
            logsAnchored: hashes.length
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET /cases/:id/audit-log/anchors
router.get('/anchors', checkMember, (req, res) => {
    const caseId = req.params.id;
    const stmt = db.prepare('SELECT * FROM anchors WHERE case_id = ? ORDER BY id DESC');
    res.json(stmt.all(caseId));
});

module.exports = router;

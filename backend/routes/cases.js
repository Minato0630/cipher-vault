const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// GET /cases
router.get('/', (req, res) => {
    // Return cases the user is a member of, along with member and document counts
    const stmt = db.prepare(`
        SELECT c.*, cm.role, 
            (SELECT COUNT(*) FROM case_members WHERE case_id = c.id) as member_count,
            (SELECT COUNT(*) FROM documents WHERE case_id = c.id) as doc_count
        FROM cases c 
        JOIN case_members cm ON c.id = cm.case_id 
        WHERE cm.user_id = ?
    `);
    const cases = stmt.all(req.user.id);
    res.json(cases);
});

// POST /cases
router.post('/', (req, res) => {
    const { title, case_number } = req.body;
    const id = crypto.randomUUID();
    
    db.transaction(() => {
        const insertCase = db.prepare('INSERT INTO cases (id, title, case_number, created_by) VALUES (?, ?, ?, ?)');
        insertCase.run(id, title, case_number, req.user.id);
        
        const insertMember = db.prepare('INSERT INTO case_members (case_id, user_id, role) VALUES (?, ?, ?)');
        // The creator is by default the supervising_officer
        insertMember.run(id, req.user.id, 'supervising_officer');
    })();
    
    res.status(201).json({ id, title, case_number });
});

// GET /cases/:id
router.get('/:id', (req, res) => {
    const caseId = req.params.id;
    
    const stmt = db.prepare(`
        SELECT c.*, cm.role 
        FROM cases c 
        JOIN case_members cm ON c.id = cm.case_id 
        WHERE c.id = ? AND cm.user_id = ?
    `);
    const caseObj = stmt.get(caseId, req.user.id);
    
    if (!caseObj) {
        return res.status(404).json({ error: 'Case not found or unauthorized' });
    }
    
    const membersStmt = db.prepare(`
        SELECT cm.user_id, cm.role, u.public_key, u.ecdsa_public_key
        FROM case_members cm 
        LEFT JOIN users u ON cm.user_id = u.id 
        WHERE cm.case_id = ?
    `);
    caseObj.members = membersStmt.all(caseId);
    
    res.json(caseObj);
});

// GET /cases/:id/documents
router.get('/:id/documents', (req, res) => {
    const caseId = req.params.id;

    // Must be member
    const checkRole = db.prepare('SELECT role FROM case_members WHERE case_id = ? AND user_id = ?');
    const userRole = checkRole.get(caseId, req.user.id);
    if (!userRole) return res.status(403).json({ error: 'Unauthorized' });

    const stmt = db.prepare(`
        SELECT d.id, d.doc_type, d.filename_encrypted, d.uploaded_by, d.uploaded_at, d.signature, d.signer_id, u.ecdsa_public_key as signer_public_key
        FROM documents d
        LEFT JOIN users u ON d.signer_id = u.id
        WHERE d.case_id = ?
        ORDER BY d.uploaded_at DESC
    `);
    const docs = stmt.all(caseId);
    res.json(docs);
});

// POST /cases/:id/members
router.post('/:id/members', (req, res) => {
    const caseId = req.params.id;
    const { targetUserId, role } = req.body; // role can be null to remove

    // Check if the current user is a supervising_officer for this case
    const checkRole = db.prepare('SELECT role FROM case_members WHERE case_id = ? AND user_id = ?');
    const userRole = checkRole.get(caseId, req.user.id);
    
    if (!userRole || userRole.role !== 'supervising_officer') {
        return res.status(403).json({ error: 'Only supervising_officer can manage members' });
    }
    
    if (role) {
        // Add or update
        const upsert = db.prepare(`
            INSERT INTO case_members (case_id, user_id, role) 
            VALUES (?, ?, ?) 
            ON CONFLICT(case_id, user_id) DO UPDATE SET role = excluded.role
        `);
        upsert.run(caseId, targetUserId, role);
    } else {
        // Remove
        const remove = db.prepare('DELETE FROM case_members WHERE case_id = ? AND user_id = ?');
        remove.run(caseId, targetUserId);
    }
    
    // Log role_change action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(caseId, req.user.id, 'role_change');

    res.json({ success: true });
});

// PATCH /cases/:id/legal-hold
router.patch('/:id/legal-hold', (req, res) => {
    const caseId = req.params.id;
    const { legal_hold } = req.body;

    const checkRole = db.prepare('SELECT role FROM case_members WHERE case_id = ? AND user_id = ?');
    const userRole = checkRole.get(caseId, req.user.id);
    if (!userRole || userRole.role !== 'supervising_officer') {
        return res.status(403).json({ error: 'Only supervising_officer can manage legal hold' });
    }

    const update = db.prepare('UPDATE cases SET legal_hold = ? WHERE id = ?');
    update.run(legal_hold ? 1 : 0, caseId);

    const auditHelper = require('../auditHelper');
    auditHelper.logAction(caseId, req.user.id, 'legal_hold_set');

    res.json({ success: true });
});

module.exports = router;

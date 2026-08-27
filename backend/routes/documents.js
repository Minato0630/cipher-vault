const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, crypto.randomUUID() + '.krypt');
    }
});
const upload = multer({ storage: storage });

// Check membership middleware
const checkMember = (req, res, next) => {
    const caseId = req.params.id;
    const checkRole = db.prepare('SELECT role FROM case_members WHERE case_id = ? AND user_id = ?');
    const userRole = checkRole.get(caseId, req.user.id);
    if (!userRole) {
        return res.status(403).json({ error: 'Unauthorized: Not a member of this case' });
    }
    req.userRole = userRole.role;
    next();
};

const canUpload = (req, res, next) => {
    const role = req.userRole;
    if (role === 'investigating_officer' || role === 'supervising_officer') {
        return next();
    }
    if (role === 'forensic_expert') {
        if (req.body.doc_type !== 'forensic_report') {
            return res.status(403).json({ error: 'Forensic experts can only upload forensic reports' });
        }
        return next();
    }
    return res.status(403).json({ error: \\ is not permitted to upload documents\ });
};

const canView = (req, res, next) => {
    const role = req.userRole;
    if (role === 'auditor') {
        return res.status(403).json({ error: 'Auditor cannot view document content' });
    }
    next();
};

// POST /cases/:id/documents
// Expects: 'document' (file), 'doc_type', 'filename_encrypted', 'wrapped_keys' (JSON string: { userId: wrappedKeyHex }), and optional metadata
router.post('/', checkMember, upload.single('document'), canUpload, (req, res) => {
    const caseId = req.params.id;
    const { doc_type, filename_encrypted, wrapped_keys, file_size, file_hash, ocr_status, ocr_text, ai_classification, ai_entities } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No ciphertext document provided' });
    }

    const docId = crypto.randomUUID();
    let keys;
    try {
        keys = JSON.parse(wrapped_keys);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid wrapped_keys JSON' });
    }

    db.transaction(() => {
        const insertDoc = db.prepare(\
            INSERT INTO documents (id, case_id, doc_type, filename_encrypted, ciphertext_ref, uploaded_by, file_size, file_hash, ocr_status, ocr_text, ai_classification, ai_entities) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \);
        insertDoc.run(docId, caseId, doc_type, filename_encrypted, file.path, req.user.id, file_size, file_hash, ocr_status || 'pending', ocr_text || null, ai_classification || null, ai_entities || null);

        const insertKey = db.prepare(\
            INSERT INTO wrapped_keys (document_id, user_id, wrapped_key) 
            VALUES (?, ?, ?)
        \);
        for (const [userId, wrappedKey] of Object.entries(keys)) {
            insertKey.run(docId, userId, wrappedKey);
        }
    })();
    
    // Log the upload action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(caseId, req.user.id, 'upload', docId);

    res.status(201).json({ id: docId });
});

// GET /cases/:id/documents
router.get('/', checkMember, (req, res) => {
    const caseId = req.params.id;
    const docs = db.prepare(\
        SELECT d.id, d.doc_type, d.filename_encrypted, d.uploaded_by, d.uploaded_at, 
               d.file_size, d.file_hash, d.legal_hold, d.ocr_status, d.ai_classification, d.ai_entities,
               (d.signature IS NOT NULL) AS is_signed
        FROM documents d 
        WHERE case_id = ?
    \).all(caseId);

    res.json(docs);
});

// GET /cases/:id/documents/:docId
router.get('/:docId', checkMember, canView, (req, res) => {
    const docId = req.params.docId;

    const docStmt = db.prepare(\
        SELECT d.*, u.ecdsa_public_key AS signer_public_key 
        FROM documents d 
        LEFT JOIN users u ON d.uploaded_by = u.id 
        WHERE d.id = ? AND d.case_id = ?
    \);
    const doc = docStmt.get(docId, req.params.id);

    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }

    const keyStmt = db.prepare('SELECT wrapped_key FROM wrapped_keys WHERE document_id = ? AND user_id = ?');
    const key = keyStmt.get(docId, req.user.id);

    if (!key) {
        return res.status(403).json({ error: 'No encryption key available for your user' });
    }

    // Log the view action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(req.params.id, req.user.id, 'view', docId);

    res.json({
        id: doc.id,
        doc_type: doc.doc_type,
        filename_encrypted: doc.filename_encrypted,
        uploaded_by: doc.uploaded_by,
        uploaded_at: doc.uploaded_at,
        wrapped_key: key.wrapped_key,
        signature: doc.signature ? doc.signature.toString('base64') : null,
        signer_public_key: doc.signer_public_key,
        file_size: doc.file_size,
        file_hash: doc.file_hash,
        legal_hold: doc.legal_hold,
        ocr_status: doc.ocr_status,
        ocr_text: doc.ocr_text,
        ai_classification: doc.ai_classification,
        ai_entities: doc.ai_entities
    });
});

// GET /cases/:id/documents/:docId/download
router.get('/:docId/download', checkMember, canView, (req, res) => {
    const docId = req.params.docId;
    const docStmt = db.prepare('SELECT ciphertext_ref FROM documents WHERE id = ? AND case_id = ?');
    const doc = docStmt.get(docId, req.params.id);

    if (!doc || !fs.existsSync(doc.ciphertext_ref)) {
        return res.status(404).json({ error: 'File not found on server' });
    }

    // Log the download action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(req.params.id, req.user.id, 'download', docId);

    res.download(doc.ciphertext_ref);
});

// DELETE /cases/:id/documents/:docId
router.delete('/:docId', checkMember, (req, res) => {
    const caseId = req.params.id;
    const docId = req.params.docId;
    
    const auditHelper = require('../auditHelper');

    // Only investigating_officer and supervising_officer can delete
    if (req.userRole !== 'investigating_officer' && req.userRole !== 'supervising_officer') {
        auditHelper.logAction(caseId, req.user.id, 'delete_attempt', docId, 'failed_unauthorized');
        return res.status(403).json({ error: 'Unauthorized to delete documents' });
    }
    
    // Check legal hold on case
    const caseStmt = db.prepare('SELECT legal_hold FROM cases WHERE id = ?');
    const caseObj = caseStmt.get(caseId);
    if (caseObj && caseObj.legal_hold) {
        auditHelper.logAction(caseId, req.user.id, 'delete_attempt', docId, 'failed_case_hold');
        return res.status(403).json({ error: 'Cannot delete document: Case is under Legal Hold' });
    }
    
    // Ensure document exists and check document legal hold
    const docStmt = db.prepare('SELECT ciphertext_ref, legal_hold FROM documents WHERE id = ? AND case_id = ?');
    const doc = docStmt.get(docId, caseId);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.legal_hold) {
        auditHelper.logAction(caseId, req.user.id, 'delete_attempt', docId, 'failed_doc_hold');
        return res.status(403).json({ error: 'Cannot delete document: Document is under Legal Hold' });
    }

    try {
        if (fs.existsSync(doc.ciphertext_ref)) {
            fs.unlinkSync(doc.ciphertext_ref);
        }
    } catch (e) {
        console.error("Failed to delete ciphertext file", e);
    }
    
    db.transaction(() => {
        db.prepare('DELETE FROM wrapped_keys WHERE document_id = ?').run(docId);
        db.prepare('DELETE FROM documents WHERE id = ? AND case_id = ?').run(docId, caseId);
    })();
    
    auditHelper.logAction(caseId, req.user.id, 'delete_document', docId);
    
    res.json({ success: true });
});

// PATCH /cases/:id/documents/:docId/legal-hold
router.patch('/:docId/legal-hold', checkMember, (req, res) => {
    const caseId = req.params.id;
    const docId = req.params.docId;
    const { legal_hold } = req.body;

    if (req.userRole !== 'supervising_officer') {
        return res.status(403).json({ error: 'Only Supervising Officer can change Document Legal Hold status' });
    }

    const docStmt = db.prepare('SELECT id FROM documents WHERE id = ? AND case_id = ?');
    if (!docStmt.get(docId, caseId)) {
        return res.status(404).json({ error: 'Document not found' });
    }

    const updateStmt = db.prepare('UPDATE documents SET legal_hold = ? WHERE id = ?');
    updateStmt.run(legal_hold ? 1 : 0, docId);

    const auditHelper = require('../auditHelper');
    auditHelper.logAction(caseId, req.user.id, legal_hold ? 'set_doc_legal_hold' : 'remove_doc_legal_hold', docId);

    res.json({ success: true, legal_hold: !!legal_hold });
});

module.exports = router;

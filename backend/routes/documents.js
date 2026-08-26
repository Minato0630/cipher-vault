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
    return res.status(403).json({ error: `${role} is not permitted to upload documents` });
};

const canView = (req, res, next) => {
    const role = req.userRole;
    if (role === 'auditor') {
        return res.status(403).json({ error: 'Auditor cannot view document content' });
    }
    next();
};

// POST /cases/:id/documents
// Expects: 'document' (file), 'doc_type', 'filename_encrypted', 'wrapped_keys' (JSON string: { userId: wrappedKeyHex })
router.post('/', checkMember, upload.single('document'), canUpload, (req, res) => {
    const caseId = req.params.id;
    const { doc_type, filename_encrypted, wrapped_keys } = req.body;
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
        const insertDoc = db.prepare(`
            INSERT INTO documents (id, case_id, doc_type, filename_encrypted, ciphertext_ref, uploaded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        // filename_encrypted comes in as hex or base64, store as string or buffer. 
        // We'll store it as is since it's just bytes represented as string from frontend
        insertDoc.run(docId, caseId, doc_type, filename_encrypted, file.path, req.user.id);

        const insertKey = db.prepare(`
            INSERT INTO wrapped_keys (document_id, user_id, wrapped_key) 
            VALUES (?, ?, ?)
        `);
        for (const [userId, wrappedKey] of Object.entries(keys)) {
            insertKey.run(docId, userId, wrappedKey);
        }
    })();
    
    // Log the upload action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(caseId, req.user.id, 'upload');

    res.status(201).json({ id: docId });
});

// GET /cases/:id/documents/:docId
router.get('/:docId', checkMember, canView, (req, res) => {
    const docId = req.params.docId;

    const docStmt = db.prepare(`
        SELECT d.*, u.ecdsa_public_key AS signer_public_key 
        FROM documents d 
        LEFT JOIN users u ON d.signer_id = u.id 
        WHERE d.id = ? AND d.case_id = ?
    `);
    const doc = docStmt.get(docId, req.params.id);

    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }

    const keyStmt = db.prepare('SELECT wrapped_key FROM wrapped_keys WHERE document_id = ? AND user_id = ?');
    const key = keyStmt.get(docId, req.user.id);

    if (!key) {
        return res.status(403).json({ error: 'No wrapped key for this user on this document' });
    }

    // Log view action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(req.params.id, req.user.id, 'view');

    res.json({
        metadata: {
            id: doc.id,
            doc_type: doc.doc_type,
            filename_encrypted: doc.filename_encrypted,
            uploaded_by: doc.uploaded_by,
            uploaded_at: doc.uploaded_at,
            signature: doc.signature,
            signer_public_key: doc.signer_public_key,
            signer_id: doc.signer_id
        },
        wrapped_key: key.wrapped_key,
        // In a real app we'd stream the file or give a separate download endpoint for the binary
        ciphertext_ref: doc.ciphertext_ref 
    });
});

// For actually downloading the binary blob
router.get('/:docId/download', checkMember, canView, (req, res) => {
    const docId = req.params.docId;
    
    // Make sure they have a key for it
    const keyStmt = db.prepare('SELECT 1 FROM wrapped_keys WHERE document_id = ? AND user_id = ?');
    const key = keyStmt.get(docId, req.user.id);
    if (!key) {
        return res.status(403).json({ error: 'No wrapped key for this user' });
    }

    const docStmt = db.prepare('SELECT ciphertext_ref FROM documents WHERE id = ? AND case_id = ?');
    const doc = docStmt.get(docId, req.params.id);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }

    // Log download action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(req.params.id, req.user.id, 'download');

    res.download(doc.ciphertext_ref);
});

// PATCH /cases/:id/documents/:docId/sign
router.patch('/:docId/sign', checkMember, canUpload, (req, res) => {
    // Only investigating_officer, supervising_officer, and forensic_expert can upload/sign
    const docId = req.params.docId;
    const { signature } = req.body;
    
    if (!signature) {
        return res.status(400).json({ error: 'Signature is required' });
    }

    const docStmt = db.prepare('SELECT id FROM documents WHERE id = ? AND case_id = ?');
    const doc = docStmt.get(docId, req.params.id);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }

    const updateStmt = db.prepare('UPDATE documents SET signature = ?, signer_id = ? WHERE id = ?');
    updateStmt.run(signature, req.user.id, docId);

    // Log sign action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(req.params.id, req.user.id, 'sign');

    res.json({ success: true });
});

// DELETE /cases/:id/documents/:docId
router.delete('/:docId', checkMember, (req, res) => {
    const caseId = req.params.id;
    const docId = req.params.docId;
    
    // Only investigating_officer and supervising_officer can delete
    if (req.userRole !== 'investigating_officer' && req.userRole !== 'supervising_officer') {
        return res.status(403).json({ error: 'Unauthorized to delete documents' });
    }
    
    // Check legal hold
    const caseStmt = db.prepare('SELECT legal_hold FROM cases WHERE id = ?');
    const caseObj = caseStmt.get(caseId);
    if (caseObj && caseObj.legal_hold) {
        return res.status(403).json({ error: 'Cannot delete document: Case is under Legal Hold' });
    }
    
    // Ensure document exists
    const docStmt = db.prepare('SELECT ciphertext_ref FROM documents WHERE id = ? AND case_id = ?');
    const doc = docStmt.get(docId, caseId);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    
    db.transaction(() => {
        // Delete keys
        db.prepare('DELETE FROM wrapped_keys WHERE document_id = ?').run(docId);
        // Delete document record
        db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
        
        // Physically delete file (optional but good practice)
        if (fs.existsSync(doc.ciphertext_ref)) {
            try {
                fs.unlinkSync(doc.ciphertext_ref);
            } catch (err) {
                console.error("Failed to delete physical file", err);
            }
        }
    })();
    
    // Log delete action
    const auditHelper = require('../auditHelper');
    auditHelper.logAction(caseId, req.user.id, 'delete_document');
    
    res.json({ success: true });
});

module.exports = router;

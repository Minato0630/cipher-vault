const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /users/:id/public-key
router.post('/:id/public-key', (req, res) => {
    const userId = req.params.id;
    
    // In Phase 1/2 we're using fake auth via x-user-id header. 
    // Usually we would verify req.user.id === userId here.
    if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to set this users key' });
    }
    
    const { public_key } = req.body;
    if (!public_key) {
        return res.status(400).json({ error: 'public_key required' });
    }

    const upsert = db.prepare(`
        INSERT INTO users (id, public_key) VALUES (?, ?) 
        ON CONFLICT(id) DO UPDATE SET public_key = excluded.public_key
    `);
    upsert.run(userId, public_key);
    
    res.json({ success: true });
});

// POST /users/:id/ecdsa-public-key
router.post('/:id/ecdsa-public-key', (req, res) => {
    const userId = req.params.id;
    
    if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to set this users key' });
    }
    
    const { ecdsa_public_key } = req.body;
    if (!ecdsa_public_key) {
        return res.status(400).json({ error: 'ecdsa_public_key required' });
    }

    const upsert = db.prepare(`
        INSERT INTO users (id, ecdsa_public_key) VALUES (?, ?) 
        ON CONFLICT(id) DO UPDATE SET ecdsa_public_key = excluded.ecdsa_public_key
    `);
    upsert.run(userId, ecdsa_public_key);
    
    res.json({ success: true });
});

module.exports = router;

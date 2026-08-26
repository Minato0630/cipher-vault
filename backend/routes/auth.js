const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Helper to convert hex to buffer
function hexToBuf(hex) {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// POST /auth/session
router.post('/session', (req, res) => {
    try {
        const { username, timestamp, signature, public_key } = req.body;
        
        if (!username || !timestamp || !signature) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Verify timestamp is within a 5-minute window (300,000 ms)
        const now = Date.now();
        if (Math.abs(now - parseInt(timestamp, 10)) > 300000) {
            return res.status(401).json({ error: 'Request expired' });
        }

        // 2. Look up user in db
        let ecdsaPublicKeyHex = null;
        const stmt = db.prepare('SELECT ecdsa_public_key FROM users WHERE id = ?');
        const user = stmt.get(username);
        
        if (!user || !user.ecdsa_public_key) {
            // If this is the user's first login, we register their public key
            if (!public_key) {
                return res.status(401).json({ error: 'Public key required for first login' });
            }
            const upsert = db.prepare(`
                INSERT INTO users (id, ecdsa_public_key) VALUES (?, ?) 
                ON CONFLICT(id) DO UPDATE SET ecdsa_public_key = excluded.ecdsa_public_key
            `);
            upsert.run(username, public_key);
            ecdsaPublicKeyHex = public_key;
        } else {
            ecdsaPublicKeyHex = user.ecdsa_public_key;
        }

        // 3. Verify signature over the payload 'login:username:timestamp'
        const payloadStr = `login:${username}:${timestamp}`;
        const payloadBuffer = Buffer.from(payloadStr, 'utf-8');
        
        // Hash the payload with SHA-256 (this matches the frontend window.signatures logic)
        const hash = crypto.createHash('sha256').update(payloadBuffer).digest();

        // Convert the raw ECDSA public key from hex
        const pubKeyBuf = hexToBuf(ecdsaPublicKeyHex);

        // Convert the raw public key to SPKI format for Node's crypto.verify
        // This is a standard DER prefix for P-256 raw uncompressed public keys
        const spkiPrefix = Buffer.from([0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00]);
        const spkiPubKey = Buffer.concat([spkiPrefix, Buffer.from(pubKeyBuf)]);
        
        const publicKeyObject = crypto.createPublicKey({
            key: spkiPubKey,
            format: 'der',
            type: 'spki'
        });

        // The frontend signature (Web Crypto API) uses raw IEEE P1363 format (r + s).
        // Node's crypto.verify natively expects DER format, but we can pass the raw signature
        // if we use 'dsaEncoding: ieee-p1363' in Node 13.2.0+.
        const signatureBuf = Buffer.from(hexToBuf(signature));
        
        // So we just specify 'SHA256' as the first argument to crypto.verify, and pass the unhashed payloadBuffer.
        
        const finalValidation = crypto.verify(
            'SHA256',
            payloadBuffer,
            { key: publicKeyObject, dsaEncoding: 'ieee-p1363' },
            signatureBuf
        );

        if (!finalValidation) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // 4. Issue JWT
        const token = jwt.sign(
            { id: username }, 
            process.env.JWT_SECRET || 'default_demo_secret_do_not_use_in_prod', 
            { expiresIn: '1h' }
        );

        res.json({ success: true, token });
    } catch (err) {
        console.error('Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

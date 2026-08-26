// keywrap.js - Case Vault Envelope Encryption & ECDH Key Management
// Loaded by app.js when Case Vault mode is active.

window.keywrap = {
    keyPair: null,

    // Initialize the KeyWrap subsystem
    async init(userId) {
        if (!userId) return;
        
        let kp = await this._loadKeyPairFromDB(userId);
        if (!kp) {
            console.log("No ECDH keypair found for user. Generating...");
            kp = await crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                false, // Private key should ideally be non-extractable, but we must store it in IndexedDB.
                // Wait, to store in IndexedDB, Web Crypto allows storing non-extractable keys!
                ["deriveKey", "deriveBits"]
            );
            await this._saveKeyPairToDB(userId, kp);
            await this._publishPublicKey(userId, kp.publicKey);
        }
        this.keyPair = kp;
    },

    // Upload Flow: Generates a random AES-256 string, wraps it for all case members
    async generateAndWrapForMembers(caseId, membersList) {
        // Generate a random string to act as the "password" for worker.js (which derives the real AES key)
        const randomVals = new Uint8Array(32);
        crypto.getRandomValues(randomVals);
        const perDocumentKeyString = Array.from(randomVals).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Convert the string to bytes for wrapping
        const ptBytes = new TextEncoder().encode(perDocumentKeyString);

        const wrappedKeys = {};
        for (const member of membersList) {
            if (!member.public_key) continue; // Skip if member hasn't registered a key yet
            
            // Import member's public key (assuming stored as raw or spki hex/base64, let's use raw hex)
            const pubKeyBuffer = this._hexToBuf(member.public_key);
            const importedPubKey = await crypto.subtle.importKey(
                "raw", pubKeyBuffer, { name: "ECDH", namedCurve: "P-256" }, true, []
            );

            // Derive shared secret (AES-GCM key for wrapping)
            const sharedSecret = await crypto.subtle.deriveKey(
                { name: "ECDH", public: importedPubKey },
                this.keyPair.privateKey,
                { name: "AES-GCM", length: 256 },
                false, ["encrypt"]
            );

            // Wrap the perDocumentKeyString using AES-GCM
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                sharedSecret,
                ptBytes
            );

            // Store IV + Ciphertext in hex
            const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(ciphertext), iv.byteLength);
            
            wrappedKeys[member.user_id] = this._bufToHex(combined);
        }

        return {
            perDocumentKeyString,
            wrappedKeys
        };
    },

    // Download Flow: Unwrap the per-document key
    async unwrapKey(wrappedKeyHex, uploaderPublicKeyHex) {
        const combined = this._hexToBuf(wrappedKeyHex);
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const uploaderPubKeyBuffer = this._hexToBuf(uploaderPublicKeyHex);
        const importedUploaderPubKey = await crypto.subtle.importKey(
            "raw", uploaderPubKeyBuffer, { name: "ECDH", namedCurve: "P-256" }, true, []
        );

        // Derive shared secret
        const sharedSecret = await crypto.subtle.deriveKey(
            { name: "ECDH", public: importedUploaderPubKey },
            this.keyPair.privateKey,
            { name: "AES-GCM", length: 256 },
            false, ["decrypt"]
        );

        // Decrypt
        const ptBytes = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            sharedSecret,
            ciphertext
        );

        return new TextDecoder().decode(ptBytes);
    },

    // --- Internal Helpers ---
    async _loadKeyPairFromDB(userId) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("CaseVaultKeysDB", 1);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("keys")) {
                    db.createObjectStore("keys", { keyPath: "userId" });
                }
            };
            req.onsuccess = e => {
                const db = e.target.result;
                const tx = db.transaction("keys", "readonly");
                const store = tx.objectStore("keys");
                const getReq = store.get(userId);
                getReq.onsuccess = () => resolve(getReq.result ? getReq.result.keyPair : null);
                getReq.onerror = () => reject(getReq.error);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async _saveKeyPairToDB(userId, keyPair) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("CaseVaultKeysDB", 1);
            req.onsuccess = e => {
                const db = e.target.result;
                const tx = db.transaction("keys", "readwrite");
                const store = tx.objectStore("keys");
                store.put({ userId, keyPair });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
        });
    },

    async _publishPublicKey(userId, publicKey) {
        const exported = await crypto.subtle.exportKey("raw", publicKey);
        const hex = this._bufToHex(exported);
        
        await fetch(`${API_BASE}/users/${userId}/public-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: hex })
        });
    },

    _bufToHex(buffer) {
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    _hexToBuf(hex) {
        const bytes = new Uint8Array(Math.ceil(hex.length / 2));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }
};

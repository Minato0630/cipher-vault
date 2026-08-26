// signatures.js - ECDSA Digital Signatures for Case Vault Documents

window.signatures = {
    keyPair: null,

    async init(userId) {
        if (!userId) return;
        
        let kp = await this._loadKeyPairFromDB(userId);
        if (!kp) {
            console.log("No ECDSA keypair found for user. Generating...");
            kp = await crypto.subtle.generateKey(
                { name: "ECDSA", namedCurve: "P-256" },
                false, // Private key should ideally be non-extractable
                ["sign", "verify"]
            );
            await this._saveKeyPairToDB(userId, kp);
            await this._publishPublicKey(userId, kp.publicKey);
        }
        this.keyPair = kp;
    },

    // Compute signature over a blob
    async signBlob(blob) {
        if (!this.keyPair) throw new Error("Signature keypair not initialized");
        
        const arrayBuffer = await blob.arrayBuffer();
        
        // Note: crypto.subtle.sign with ECDSA hashes the input data internally using the specified hash function.
        // We specify SHA-256 here as requested.
        const signatureBuf = await crypto.subtle.sign(
            { name: "ECDSA", hash: { name: "SHA-256" } },
            this.keyPair.privateKey,
            arrayBuffer
        );
        
        return this._bufToHex(signatureBuf);
    },

    // Verify a signature over a blob
    async verifyBlob(blob, signatureHex, publicKeyHex) {
        const arrayBuffer = await blob.arrayBuffer();
        const signatureBuf = this._hexToBuf(signatureHex);
        const pubKeyBuf = this._hexToBuf(publicKeyHex);
        
        const importedPubKey = await crypto.subtle.importKey(
            "raw", pubKeyBuf, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]
        );

        const isValid = await crypto.subtle.verify(
            { name: "ECDSA", hash: { name: "SHA-256" } },
            importedPubKey,
            signatureBuf,
            arrayBuffer
        );
        
        return isValid;
    },

    // --- Internal Helpers ---
    async _loadKeyPairFromDB(userId) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("CaseVaultKeysDB", 3);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("keys")) {
                    db.createObjectStore("keys", { keyPath: "userId" });
                }
                if (!db.objectStoreNames.contains("ecdsa_keys")) {
                    db.createObjectStore("ecdsa_keys", { keyPath: "userId" });
                }
            };
            req.onsuccess = e => {
                const db = e.target.result;
                const tx = db.transaction("ecdsa_keys", "readonly");
                const store = tx.objectStore("ecdsa_keys");
                const getReq = store.get(userId);
                getReq.onsuccess = () => resolve(getReq.result ? getReq.result.keyPair : null);
                getReq.onerror = () => reject(getReq.error);
            };
            req.onerror = () => reject(req.error);
        });
    },
    
    async _upgradeDBForECDSA(userId) {
        // Deprecated: handled by version 3 upgrader in _loadKeyPairFromDB directly.
        return this._loadKeyPairFromDB(userId);
    },

    async _saveKeyPairToDB(userId, keyPair) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("CaseVaultKeysDB", 3);
            req.onsuccess = e => {
                const db = e.target.result;
                const tx = db.transaction("ecdsa_keys", "readwrite");
                const store = tx.objectStore("ecdsa_keys");
                store.put({ userId, keyPair });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
        });
    },

    async _publishPublicKey(userId, publicKey) {
        const exported = await crypto.subtle.exportKey("raw", publicKey);
        const hex = this._bufToHex(exported);
        
        try {
            const token = sessionStorage.getItem('cipherVaultToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                // If we don't have a token, we might be in the middle of login.
                // The backend will reject this unless we have a session, 
                // but we will send the public key to /auth/session anyway.
                return;
            }
            await fetch(`${API_BASE}/users/${userId}/ecdsa-public-key`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ecdsa_public_key: hex })
            });
        } catch (e) {
            console.warn("Failed to publish ECDSA key:", e);
        }
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

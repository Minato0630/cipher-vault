// accounts.js - Local accounts and profiles coordinator for CipherVault (Offline-Only)

(function() {
    // Helper to compare Uint8Arrays
    function buffersEqual(a, b) {
        if (a.byteLength !== b.byteLength) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result === 0;
    }

    // Cryptographic PBKDF2 hashing for local profile passwords
    async function hashProfilePassword(password, salt) {
        const encoder = new TextEncoder();
        const passwordKey = encoder.encode(password);
        
        // Import raw password key
        const baseKey = await crypto.subtle.importKey(
            "raw",
            passwordKey,
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
        );

        // Derive bits using 600,000 iterations (matching file-encryption strength)
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 600000,
                hash: "SHA-256"
            },
            baseKey,
            256
        );

        return new Uint8Array(derivedBits);
    }

    // Helper to generate a cryptographically random salt
    function generateSalt(length = 16) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    // Define account controls
    window.accounts = {
        // Creates a new local profile in IndexedDB
        createProfile: async function(username, password) {
            username = username.trim();
            if (!username) throw new Error("Username cannot be empty");
            if (password.length < 4) throw new Error("Password must be at least 4 characters long");

            // Check if profile already exists
            const existing = await window.db.getProfile(username);
            if (existing) {
                throw new Error("Profile already exists. Choose a different username.");
            }

            const salt = generateSalt();
            const passwordHash = await hashProfilePassword(password, salt);

            const newProfile = {
                username: username,
                passwordHash: passwordHash,
                salt: salt,
                settings: {
                    keepBlobs: false // Off by default
                }
            };

            await window.db.saveProfile(newProfile);
            return newProfile;
        },

        // Log in to an existing local profile
        login: async function(username, password) {
            username = username.trim();
            if (!username || !password) {
                throw new Error("Username and password are required.");
            }

            const profile = await window.db.getProfile(username);
            if (!profile) {
                throw new Error("Profile not found");
            }

            const hashAttempt = await hashProfilePassword(password, profile.salt);
            if (!buffersEqual(hashAttempt, profile.passwordHash)) {
                throw new Error("Incorrect password");
            }

            // Save session in sessionStorage (expires on tab close)
            sessionStorage.setItem("cipherVaultUser", username);
            sessionStorage.setItem("cipherVaultUserName", username);
            return profile;
        },

        // Log out the active profile session
        logout: function() {
            sessionStorage.removeItem("cipherVaultUser");
            sessionStorage.removeItem("cipherVaultUserName");
        },

        // Returns active user's username or null
        getCurrentUser: function() {
            return sessionStorage.getItem("cipherVaultUser") || null;
        },

        // Returns active user's display name
        getCurrentDisplayName: function() {
            return sessionStorage.getItem("cipherVaultUserName") || sessionStorage.getItem("cipherVaultUser") || "User";
        },

        // Get list of usernames for switcher UI
        getProfilesList: async function() {
            const list = await window.db.getAllProfiles();
            return list.map(p => p.username);
        },

        // Updates user settings (e.g. keepBlobs toggle)
        updateSettings: async function(username, settings) {
            const profile = await window.db.getProfile(username);
            if (!profile) return;
            profile.settings = { ...profile.settings, ...settings };
            await window.db.saveProfile(profile);
        },

        // Returns user settings
        getSettings: async function(username) {
            const profile = await window.db.getProfile(username);
            return profile ? profile.settings : { keepBlobs: false };
        }
    };
})();

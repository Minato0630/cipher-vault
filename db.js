// db.js - IndexedDB Helper Module for CipherVault
const DB_NAME = "CipherVaultDB";
const DB_VERSION = 1;

let dbInstance = null;

// Opens the IndexedDB database and configures stores
function getDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (e) => {
            console.error("IndexedDB failed to open:", e);
            reject(e.target.error || new Error("Failed to open DB"));
        };

        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("profiles")) {
                db.createObjectStore("profiles", { keyPath: "username" });
            }
            if (!db.objectStoreNames.contains("history")) {
                db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
            }
        };
    });
}

// PROFILE OPERATIONS
window.db = {
    getProfile: function(username) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("profiles", "readonly");
                const store = tx.objectStore("profiles");
                const req = store.get(username);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    saveProfile: function(profile) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("profiles", "readwrite");
                const store = tx.objectStore("profiles");
                const req = store.put(profile);
                req.onsuccess = () => resolve(true);
                req.onerror = (e) => {
                    const err = req.error;
                    if (err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
                        reject(new Error("QUOTA_EXCEEDED"));
                    } else {
                        reject(err);
                    }
                };
            } catch (err) {
                reject(err);
            }
        });
    },

    getAllProfiles: function() {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("profiles", "readonly");
                const store = tx.objectStore("profiles");
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    // HISTORY OPERATIONS
    getHistory: function(username) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("history", "readonly");
                const store = tx.objectStore("history");
                const req = store.getAll();
                req.onsuccess = () => {
                    // Filter history entries strictly for the current logged-in profile
                    const userHistory = (req.result || []).filter(item => item.username === username);
                    resolve(userHistory);
                };
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    addHistoryEntry: function(entry) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("history", "readwrite");
                const store = tx.objectStore("history");
                const req = store.add(entry);
                req.onsuccess = () => resolve(req.result);
                req.onerror = (e) => {
                    const err = req.error;
                    if (err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
                        reject(new Error("QUOTA_EXCEEDED"));
                    } else {
                        reject(err || new Error("Failed to write entry to database"));
                    }
                };
            } catch (err) {
                reject(err);
            }
        });
    },

    deleteHistoryEntry: function(id) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("history", "readwrite");
                const store = tx.objectStore("history");
                const req = store.delete(id);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    clearHistory: function(username) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await getDB();
                const tx = db.transaction("history", "readwrite");
                const store = tx.objectStore("history");
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        if (cursor.value.username === username) {
                            cursor.delete();
                        }
                        cursor.continue();
                    } else {
                        resolve(true);
                    }
                };
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }
};

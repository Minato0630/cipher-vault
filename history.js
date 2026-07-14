// history.js - Per-Profile Processed History Manager for CipherVault

(function() {
    // Utility to format file sizes
    function formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    // Dynamic storage usage indicator using Browser Storage API
    async function updateStorageQuotaDisplay() {
        const indicator = document.getElementById("storage-usage-info");
        if (!indicator) return;

        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const usageStr = formatBytes(estimate.usage);
                const quotaStr = formatBytes(estimate.quota);
                indicator.textContent = `${usageStr} used of ${quotaStr} local browser quota`;
            } catch (err) {
                console.warn("Storage quota estimation failed:", err);
                indicator.textContent = "Local storage usage estimation unavailable";
            }
        } else {
            indicator.textContent = "Offline storage estimation not supported by browser";
        }
    }

    window.historyManager = {
        // Logs a completed file process run into IndexedDB
        saveRun: async function(fileName, fileType, fileSize, action, outputBlob) {
            const username = window.accounts.getCurrentUser();
            if (!username) return;

            const settings = await window.accounts.getSettings(username);
            let blobToStore = null;

            // Optional Blob storage for quick offline re-downloads
            if (settings.keepBlobs && outputBlob) {
                blobToStore = outputBlob;
            }

            const entry = {
                username,
                fileName,
                fileType: fileType || "application/octet-stream",
                fileSize,
                action, // "encrypt" or "decrypt"
                timestamp: Date.now(),
                blob: blobToStore
            };

            try {
                await window.db.addHistoryEntry(entry);
                await updateStorageQuotaDisplay();
                this.render();
            } catch (err) {
                if (err.message === "QUOTA_EXCEEDED") {
                    throw new Error("QUOTA_EXCEEDED");
                }
                throw err;
            }
        },

        // Delete a specific history log entry
        deleteEntry: async function(id) {
            await window.db.deleteHistoryEntry(id);
            await updateStorageQuotaDisplay();
            this.render();
        },

        // Clear all history entries for current user
        clearAll: async function() {
            const username = window.accounts.getCurrentUser();
            if (!username) return;
            await window.db.clearHistory(username);
            await updateStorageQuotaDisplay();
            this.render();
        },

        // Triggers download of a pre-saved Blob in history
        downloadBlob: function(id, fileName, fileType) {
            window.db.getHistory(window.accounts.getCurrentUser()).then(list => {
                const item = list.find(x => x.id === id);
                if (!item || !item.blob) {
                    alert("Saved file data not found in this history entry.");
                    return;
                }

                const url = URL.createObjectURL(item.blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 150);
            }).catch(err => {
                console.error("Failed to read history blob:", err);
            });
        },

        // Renders the searchable, filterable log entries
        render: async function() {
            const username = window.accounts.getCurrentUser();
            const listEl = document.getElementById("history-list");
            const clearBtn = document.getElementById("btn-clear-history");
            if (!listEl) return;

            if (!username) {
                listEl.innerHTML = `<div class="history-empty">Please log in to view history log.</div>`;
                if (clearBtn) clearBtn.style.display = "none";
                return;
            }

            try {
                let items = await window.db.getHistory(username);
                await updateStorageQuotaDisplay();

                if (items.length === 0) {
                    listEl.innerHTML = `<div class="history-empty">No history logs found for this profile.</div>`;
                    if (clearBtn) clearBtn.style.display = "none";
                    return;
                }

                if (clearBtn) clearBtn.style.display = "inline-flex";

                // Read search query & filters
                const searchInput = document.getElementById("history-search");
                const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
                
                const filterType = document.getElementById("history-filter-type");
                const type = filterType ? filterType.value : "all"; // all, encrypt, decrypt

                // Filter matching query & type
                items = items.filter(item => {
                    const matchesSearch = item.fileName.toLowerCase().includes(query);
                    const matchesType = (type === "all") || (item.action === type);
                    return matchesSearch && matchesType;
                });

                // Sort by timestamp descending (newest first)
                items.sort((a, b) => b.timestamp - a.timestamp);

                if (items.length === 0) {
                    listEl.innerHTML = `<div class="history-empty">No entries match your search filters.</div>`;
                    return;
                }

                listEl.innerHTML = "";
                items.forEach(item => {
                    const row = document.createElement("div");
                    row.className = "history-item";
                    
                    const timeStr = new Date(item.timestamp).toLocaleString();
                    const actionBadgeClass = item.action === "encrypt" ? "history-badge encrypt" : "history-badge decrypt";
                    const actionLabel = item.action === "encrypt" ? "ENCRYPTED" : "DECRYPTED";

                    // File download capability check
                    const hasBlob = !!item.blob;
                    const downloadBtnHtml = hasBlob 
                        ? `<button class="btn-history-dl" onclick="historyManager.downloadBlob(${item.id}, '${item.fileName}', '${item.fileType}')" title="Re-download file instantly">
                             <i class="fa-solid fa-download"></i> Download
                           </button>`
                        : `<span class="history-meta-no-blob" title="File not stored locally in history (Keep files option was off)">
                             <i class="fa-solid fa-file-circle-minus"></i> No download
                           </span>`;

                    row.innerHTML = `
                        <div class="history-main-info">
                            <span class="${actionBadgeClass}">${actionLabel}</span>
                            <span class="history-name" title="${item.fileName}">${item.fileName}</span>
                        </div>
                        <div class="history-details-info">
                            <span class="history-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                            <span class="history-size"><i class="fa-regular fa-hard-drive"></i> ${formatBytes(item.fileSize)}</span>
                        </div>
                        <div class="history-row-actions">
                            ${downloadBtnHtml}
                            <button class="btn-history-del" onclick="historyManager.deleteEntry(${item.id})" title="Delete entry from log">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    `;
                    listEl.appendChild(row);
                });
            } catch (err) {
                console.error("Failed to render history list:", err);
                listEl.innerHTML = `<div class="history-empty error">Failed to load local logs.</div>`;
            }
        }
    };
})();

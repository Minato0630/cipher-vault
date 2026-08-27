// cases.js - Frontend controller for Case Vault mode

window.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : window.location.origin;
const API_BASE_CV = `${window.API_BASE}/cases`;

window.casesUI = {
    initialized: false,
    activeCaseId: null,
    myRole: null,
    docsCache: [],
    
    async init() {
        if (this.initialized) return;
        this.initialized = true;

        // Bind dashboard buttons
        document.getElementById('cv-btn-new-case').addEventListener('click', () => this.handleNewCase());
        document.getElementById('cv-btn-back').addEventListener('click', () => this.showDashboard());
        
        // Bind detail view buttons
        document.getElementById('cv-btn-upload-doc').addEventListener('click', () => this.handleUploadDoc());
        document.getElementById('cv-btn-add-member').addEventListener('click', () => this.handleAddMember());
        document.getElementById('cv-btn-verify-audit').addEventListener('click', () => this.verifyAudit());
        document.getElementById('cv-btn-anchor-audit').addEventListener('click', () => this.anchorAudit());
        
        // Search
        document.getElementById('cv-search-docs').addEventListener('input', (e) => this.filterDocs(e.target.value));
        
        // Legal hold
        document.getElementById('cv-legal-hold').addEventListener('change', (e) => this.toggleLegalHold(e.target.checked));
        
        await this.showDashboard();
    },

    getUserId() {
        return window.accounts.getCurrentUser();
    },

    // --- VIEW CONTROLLERS ---

    async showDashboard() {
        this.activeCaseId = null;
        window.activeCaseId = null; // Sync with app.js
        if (window.app && window.app.el && window.app.el.btnSaveToCase) {
            window.app.el.btnSaveToCase.style.display = 'none';
        } else {
            const btn = document.getElementById('btn-save-to-case');
            if (btn) btn.style.display = 'none';
        }
        document.getElementById('cv-dashboard-view').style.display = 'block';
        document.getElementById('cv-detail-view').style.display = 'none';
        
        try {
            const res = await fetch(API_BASE_CV, { headers: { 'x-user-id': this.getUserId() } });
            if (!res.ok) throw new Error("Failed to fetch cases");
            const cases = await res.json();
            
            const list = document.getElementById('cv-cases-list');
            list.innerHTML = '';
            
            if (cases.length === 0) {
                list.innerHTML = '<p style="color: var(--text-secondary);">No cases found. You are not a member of any case.</p>';
            }

            cases.forEach(c => {
                const card = document.createElement('div');
                card.className = 'case-card card';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <h3>${c.title}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 10px; font-size: 0.85rem;">Case #: ${c.case_number || 'N/A'}</p>
                    <div style="display: flex; gap: 15px; font-size: 0.85rem;">
                        <span><i class="fa-solid fa-users"></i> ${c.member_count} members</span>
                        <span><i class="fa-solid fa-file-contract"></i> ${c.doc_count} docs</span>
                        <span class="badge-role badge-role-${c.role}">${c.role.replace('_', ' ')}</span>
                    </div>
                    ${c.legal_hold ? '<p style="color: #ef5350; font-size: 0.8rem; font-weight: bold; margin-top: 10px;"><i class="fa-solid fa-scale-balanced"></i> LEGAL HOLD</p>' : ''}
                `;
                card.addEventListener('click', () => this.showCaseDetail(c.id));
                list.appendChild(card);
            });
            
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
        }
    },

    async showCaseDetail(caseId) {
        this.activeCaseId = caseId;
        window.activeCaseId = caseId; // for Phase 4 mock if used
        
        document.getElementById('cv-dashboard-view').style.display = 'none';
        document.getElementById('cv-detail-view').style.display = 'block';
        
        try {
            // Load case & members
            const resCase = await fetch(`${API_BASE_CV}/${caseId}`, { headers: { 'x-user-id': this.getUserId() } });
            if (!resCase.ok) throw new Error("Failed to fetch case");
            const caseObj = await resCase.json();
            
            this.myRole = caseObj.role;
            
            document.getElementById('cv-case-title').innerText = caseObj.title;
            document.getElementById('cv-case-number').innerText = caseObj.case_number || 'N/A';
            document.getElementById('cv-my-role').innerText = caseObj.role.replace('_', ' ');
            document.getElementById('cv-my-role').className = `badge-role badge-role-${caseObj.role}`;
            
            const legalHoldCb = document.getElementById('cv-legal-hold');
            legalHoldCb.checked = !!caseObj.legal_hold;
            legalHoldCb.disabled = (this.myRole !== 'supervising_officer');
            
            // Render Members
            this.renderMembers(caseObj.members);
            
            // Visibility logic
            document.getElementById('cv-add-member-container').style.display = (this.myRole === 'supervising_officer') ? 'block' : 'none';
            document.getElementById('cv-btn-upload-doc').style.display = ['investigating_officer', 'supervising_officer', 'forensic_expert'].includes(this.myRole) ? 'block' : 'none';
            
            // Activate the Save to Case button in the Personal Vault encrypt screen
            if (window.applyCaseVaultRoleUI) window.applyCaseVaultRoleUI(this.myRole);
            
            // Load Docs
            await this.loadDocs();
            
            // Load Audit Trail
            await this.loadAudit();
            
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
            this.showDashboard();
        }
    },

    // --- DOCUMENTS ---

    async loadDocs() {
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/documents`, { headers: { 'x-user-id': this.getUserId() } });
            if (!res.ok) throw new Error("Failed to fetch documents");
            this.docsCache = await res.json();
            this.renderDocs(this.docsCache);
        } catch (e) {
            console.error(e);
        }
    },

    renderDocs(docs) {
        const list = document.getElementById('cv-docs-list');
        list.innerHTML = '';
        
        if (docs.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No documents found.</p>';
            return;
        }

        docs.forEach(d => {
            const el = document.createElement('div');
            el.className = 'card';
            el.style.padding = '12px';
            el.style.marginBottom = '10px';
            el.style.background = 'var(--bg-tertiary)';
            
            const dDate = new Date(d.uploaded_at).toLocaleString();
            
            // Badge logic
            let sigBadge = `<span style="font-size: 0.75rem; color: gray;"><i class="fa-solid fa-pen-nib"></i> Unsigned</span>`;
            if (d.signature) {
                sigBadge = `<span style="font-size: 0.75rem; color: #4caf50; font-weight: bold;"><i class="fa-solid fa-check-double"></i> Signed by ${d.signer_id}</span>`;
            }
            
            const btnDelete = (window.casesUI.myRole === 'supervising_officer' || window.casesUI.myRole === 'investigating_officer') 
                ? `<button class="btn-link" onclick="window.casesUI.deleteDoc('${d.id}')" style="color: #ef5350; padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i> Delete</button>`
                : '';
            
            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="margin: 0; font-size: 0.9rem;">${d.doc_type.toUpperCase()} - ${d.id.substring(0, 8)}...</h4>
                        <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">Uploaded by ${d.uploaded_by} on ${dDate}</p>
                        <div style="margin-top: 6px;">${sigBadge}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary btn-sm" onclick="window.casesUI.openDoc('${d.id}')" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-folder-open"></i> Open</button>
                        ${btnDelete}
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    },

    filterDocs(query) {
        if (!query) {
            this.renderDocs(this.docsCache);
            return;
        }
        const lower = query.toLowerCase();
        const filtered = this.docsCache.filter(d => 
            d.doc_type.toLowerCase().includes(lower) || 
            d.uploaded_by.toLowerCase().includes(lower)
        );
        this.renderDocs(filtered);
    },

    async handleUploadDoc() {
        const personalVaultBtn = document.getElementById('nav-mode-personal');
        if (personalVaultBtn) {
            personalVaultBtn.click();
            window.showToast('info', 'Encrypt your file here or use recently processed files, then click "Save to Case" to upload.');
        } else {
            window.showToast('error', 'Could not switch to Personal Vault.');
        }
    },

    async openDoc(docId) {
        // Trigger Phase 4 mock logic
        if (window.showPhase4Mock) {
            window.showPhase4Mock(docId);
            document.getElementById('cv-detail-view').appendChild(document.getElementById('mock-doc-view'));
            // Optionally, automatically click 'Open Document' in the mock
            setTimeout(() => document.getElementById('btn-mock-open').click(), 100);
        }
    },

    async deleteDoc(docId) {
        if (!confirm(`Are you sure you want to delete this document?`)) return;
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': this.getUserId() }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete document");
            
            window.showToast('success', 'Document deleted successfully');
            this.loadDocs();
            this.loadAudit();
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
        }
    },

    // --- MEMBERS ---

    renderMembers(members) {
        const list = document.getElementById('cv-members-list');
        list.innerHTML = '';
        members.forEach(m => {
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.padding = '8px 0';
            el.style.borderBottom = '1px solid var(--border-color)';
            
            const btnRemove = (this.myRole === 'supervising_officer' && m.user_id !== this.getUserId()) 
                ? `<button onclick="window.casesUI.removeMember('${m.user_id}')" class="btn-link" style="color: #ef5350; font-size: 0.75rem; padding: 0;"><i class="fa-solid fa-trash"></i></button>`
                : '';
                
            el.innerHTML = `
                <span style="font-size: 0.85rem;"><strong>${m.user_id}</strong> <span class="badge-role badge-role-${m.role}" style="margin-left: 5px;">${m.role.replace('_', ' ')}</span></span>
                ${btnRemove}
            `;
            list.appendChild(el);
        });
    },

    async handleAddMember() {
        const userId = document.getElementById('cv-new-member-id').value.trim();
        const role = document.getElementById('cv-new-member-role').value;
        if (!userId) return;
        
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': this.getUserId() },
                body: JSON.stringify({ targetUserId: userId, role })
            });
            if (!res.ok) throw new Error("Failed to add member");
            
            document.getElementById('cv-new-member-id').value = '';
            window.showToast('success', 'Member updated');
            
            // Reload case details to refresh members and audit
            this.showCaseDetail(this.activeCaseId);
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
        }
    },

    async removeMember(userId) {
        if (!confirm(`Remove ${userId} from this case?`)) return;
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': this.getUserId() },
                body: JSON.stringify({ targetUserId: userId, role: null })
            });
            if (!res.ok) throw new Error("Failed to remove member");
            window.showToast('success', 'Member removed');
            this.showCaseDetail(this.activeCaseId);
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
        }
    },

    // --- AUDIT TRAIL ---

    async loadAudit() {
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/audit-log`, { headers: { 'x-user-id': this.getUserId() } });
            if (!res.ok) throw new Error("Failed to fetch audit log");
            const logs = await res.json();
            
            const list = document.getElementById('cv-audit-list');
            list.innerHTML = '';
            
            logs.forEach(l => {
                const el = document.createElement('div');
                el.style.padding = '6px';
                el.style.background = 'var(--bg-tertiary)';
                el.style.borderRadius = 'var(--border-radius-sm)';
                el.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <strong>${l.action.toUpperCase()}</strong>
                        <span style="color: var(--text-secondary);">${new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="color: var(--text-secondary); margin-top: 3px;">By ${l.actor_id}</div>
                `;
                list.appendChild(el);
            });
            
            // Load Anchors
            const resAnchors = await fetch(`${API_BASE_CV}/${this.activeCaseId}/audit-log/anchors`, { headers: { 'x-user-id': this.getUserId() } });
            if (!resAnchors.ok) throw new Error("Failed to fetch anchors");
            const anchors = await resAnchors.json();
            
            const aList = document.getElementById('cv-anchors-list');
            aList.innerHTML = '';
            if (anchors.length === 0) aList.innerHTML = '<span style="color: gray;">No anchors yet</span>';
            anchors.forEach(a => {
                const el = document.createElement('div');
                el.innerHTML = `<a href="https://amoy.polygonscan.com/tx/${a.tx_hash}" target="_blank" style="color: var(--accent-light); text-decoration: none;"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${a.tx_hash.substring(0,10)}...</a> <span style="color: gray; margin-left: 5px;">${new Date(a.timestamp).toLocaleDateString()}</span>`;
                aList.appendChild(el);
            });
            
        } catch (e) {
            console.error(e);
        }
    },

    async verifyAudit() {
        const statusEl = document.getElementById('cv-audit-verification-status');
        statusEl.innerText = "Verifying...";
        statusEl.style.color = "orange";
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/audit-log/verify`, { headers: { 'x-user-id': this.getUserId() } });
            const data = await res.json();
            if (data.intact) {
                statusEl.innerHTML = `<i class="fa-solid fa-shield-check"></i> Chain Intact (${data.entries} entries)`;
                statusEl.style.color = "#4caf50";
            } else {
                statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> TAMPERING DETECTED at entry ID ${data.broken_at_id}!`;
                statusEl.style.color = "#ef5350";
            }
        } catch (e) {
            console.error(e);
            statusEl.innerText = "Error verifying";
            statusEl.style.color = "red";
        }
    },

    async anchorAudit() {
        window.showToast('info', 'Anchoring to Polygon Amoy... This may take a few seconds.');
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/audit-log/anchor`, { 
                method: 'POST',
                headers: { 'x-user-id': this.getUserId() }
            });
            const data = await res.json();
            if (data.anchored) {
                window.showToast('success', `Anchored ${data.logsAnchored} logs! TX: ${data.txHash}`);
                this.loadAudit();
            } else {
                window.showToast('info', data.message || 'No action needed.');
            }
        } catch (e) {
            console.error(e);
            window.showToast('error', 'Anchor failed: ' + e.message);
        }
    },

    // --- OTHER ACTIONS ---

    async handleNewCase() {
        const title = prompt("Enter new case title:");
        if (!title) return;
        const case_number = prompt("Enter case number (optional):") || '';
        
        try {
            const res = await fetch(API_BASE_CV, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': this.getUserId() },
                body: JSON.stringify({ title, case_number })
            });
            if (!res.ok) throw new Error("Failed to create case");
            
            window.showToast('success', 'Case created');
            this.showDashboard();
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
        }
    },

    async toggleLegalHold(enabled) {
        if (!confirm(`Are you sure you want to turn ${enabled ? 'ON' : 'OFF'} legal hold?`)) {
            document.getElementById('cv-legal-hold').checked = !enabled;
            return;
        }
        try {
            const res = await fetch(`${API_BASE_CV}/${this.activeCaseId}/legal-hold`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-id': this.getUserId() },
                body: JSON.stringify({ legal_hold: enabled })
            });
            if (!res.ok) throw new Error("Failed to update legal hold");
            window.showToast('success', `Legal hold ${enabled ? 'enabled' : 'disabled'}`);
            this.loadAudit(); // reload audit to see the action
        } catch (e) {
            console.error(e);
            window.showToast('error', e.message);
            document.getElementById('cv-legal-hold').checked = !enabled;
        }
    }
};

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    public_key TEXT,
    ecdsa_public_key TEXT
);

CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    case_number TEXT,
    status TEXT DEFAULT 'open',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    legal_hold BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS case_members (
    case_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- investigating_officer, supervising_officer, forensic_expert, court_clerk, auditor
    PRIMARY KEY (case_id, user_id),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    doc_type TEXT NOT NULL, -- fir, witness_statement, charge_sheet, evidence_record, forensic_report, court_filing, judgment, other
    filename_encrypted BLOB NOT NULL,
    ciphertext_ref TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    signature BLOB,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wrapped_keys (
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    wrapped_key BLOB NOT NULL,
    PRIMARY KEY (document_id, user_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL, -- upload, view, download, sign, role_change, legal_hold_set
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    prev_hash TEXT,
    entry_hash TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anchors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    merkle_root TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

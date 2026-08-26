const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'case_vault.db');
const db = new Database(dbPath);

// Initialize schema if not exists
const schemaPath = path.join(__dirname, 'db-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

module.exports = db;

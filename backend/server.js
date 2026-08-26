require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the frontend static files from the parent directory (must be before auth)
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

const jwt = require('jsonwebtoken');

// JWT Authentication Middleware for Phase 9
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: missing or invalid authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'default_demo_secret_do_not_use_in_prod');
        req.user = payload; // payload contains { id: username }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: token expired or invalid' });
    }
};


// Routes
app.use('/auth', require('./routes/auth'));
app.use('/cases', authMiddleware, require('./routes/cases'));
app.use('/cases/:id/documents', authMiddleware, require('./routes/documents'));
app.use('/cases/:id/audit-log', authMiddleware, require('./routes/audit'));
app.use('/users', authMiddleware, require('./routes/users'));

// Catch-all to serve index.html for unknown routes (SPA fallback)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(port, () => {
    console.log(`Case Vault backend listening on port ${port}`);
});

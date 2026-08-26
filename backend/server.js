const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the frontend static files from the parent directory (must be before auth)
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

// Fake Authentication Middleware for Phase 1
const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header' });
    }
    req.user = { id: userId };
    next();
};


// Routes
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

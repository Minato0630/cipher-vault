const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Fake Authentication Middleware for Phase 1
// In Phase 1, we stub auth. A client must send a custom header: 'x-user-id'
app.use((req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header' });
    }
    req.user = { id: userId };
    next();
});

// Routes
app.use('/cases', require('./routes/cases'));
app.use('/cases/:id/documents', require('./routes/documents'));
app.use('/cases/:id/audit-log', require('./routes/audit'));
app.use('/users', require('./routes/users'));

app.listen(port, () => {
    console.log(`Case Vault backend listening on port ${port}`);
});

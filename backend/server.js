/**
 * ScamBook API + static frontend
 * Cloud-ready: stateless JWT auth, env-based DB (RDS), file paths compatible with S3 migration
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const postRoutes = require('../routes/postRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const root = path.join(__dirname, '..');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Uploaded images + CSS/JS — on AWS, replace /assets/uploads/* with S3 + CloudFront URLs in DB
app.use('/assets', express.static(path.join(root, 'assets')));

// API routes (exact paths per spec)
app.use(authRoutes);
app.use(userRoutes);
app.use(postRoutes);

// SPA-like HTML pages
app.use(express.static(path.join(root, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(root, 'frontend', 'index.html'));
});

// Health check for load balancers / ECS
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'scambook' });
});

// 404 for unknown API-style paths
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ScamBook running at http://localhost:${PORT}`);
});

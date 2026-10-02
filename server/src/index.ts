import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config } from './config/index.js';
import { db } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import personRoutes from './routes/personRoutes.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // For local SPA proxy compatibility
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Global Rate Limiter
app.use(rateLimiter(config.rateLimitMaxRequests, config.rateLimitWindowMs));

// Body parsers
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Ensure storage directories exist
if (!fs.existsSync(config.storageDir)) {
  fs.mkdirSync(config.storageDir, { recursive: true });
}

import { loadDatasetsFromCSV } from './db/csvLoader.js';

// Auto-seed if empty database or only mock demo cases
if (db.users.length === 0) {
  console.log('[SYSTEM] Empty database detected. Auto-seeding initial dataset...');
  seedDatabase()
    .then(() => loadDatasetsFromCSV().catch(err => console.log('[CSV-LOAD] Note:', err.message)))
    .catch(err => console.error('[SEED-ERROR]', err));
} else if (db.cases.length < 50) {
  console.log('[SYSTEM] Auto-ingesting official CSV datasets into database...');
  loadDatasetsFromCSV().catch(err => console.log('[CSV-LOAD] Note:', err.message));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);


// Error Handler
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`  NyayaSetu Backend Server Active`);
  console.log(`  Agency: Ministry of Home Affairs / NCRB`);
  console.log(`  Listening on: http://localhost:${config.port}`);
  console.log(`  Storage Directory: ${config.storageDir}`);
  console.log(`=======================================================`);
});

export { app, server };

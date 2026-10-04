import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import { config } from './config/index.js';
import { PostgresService } from './db/postgres.js';
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

/**
 * Institutional Startup Workflow:
 * FAIL-STOP POLICY: If PostgreSQL is unreachable, immediately abort process.
 * Zero-fallback: No reading or writing database.json during runtime.
 */
async function startServer() {
  console.log('[NyayaSetu] Bootstrapping institutional backend...');
  console.log('[NyayaSetu] Verifying authoritative PostgreSQL connection...');

  const conn = await PostgresService.testConnection();
  if (!conn.connected) {
    console.error(`\n=======================================================`);
    console.error(`[FATAL] CRITICAL STARTUP FAILURE: PostgreSQL is unreachable.`);
    console.error(`Details: ${conn.error}`);
    console.error(`PostgreSQL is the mandatory authoritative Single Source of Truth.`);
    console.error(`The application is configured with ZERO-FALLBACK policy.`);
    console.error(`Halting server boot immediately (exit code 1).`);
    console.error(`=======================================================\n`);
    process.exit(1);
  }

  console.log(`[NyayaSetu] Connected to PostgreSQL ${conn.version} (database: ${conn.database})`);

  // Ensure database schema is initialized
  await PostgresService.ensureDatabaseExists().catch(() => {});
  const schemaInit = await PostgresService.initializeSchema();
  if (!schemaInit.success) {
    console.error(`[FATAL] Failed to verify schema in PostgreSQL: ${schemaInit.error}`);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`  NyayaSetu Backend Server Active (PostgreSQL-Only Mode)`);
    console.log(`  Authoritative Store: PostgreSQL 16 (${conn.database})`);
    console.log(`  Zero-Fallback Mode: ACTIVE (database.json reads/writes DISABLED)`);
    console.log(`  Agency: Ministry of Home Affairs / NCRB`);
    console.log(`  Listening on: http://localhost:${config.port}`);
    console.log(`  Storage Directory: ${config.storageDir}`);
    console.log(`=======================================================`);
  });

  return server;
}

const serverPromise = startServer();
export { app, serverPromise };

import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'nyayasetu-mha-ncrb-production-grade-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  storageDir: process.env.STORAGE_DIR || path.join(process.cwd(), 'data', 'storage'),
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.json'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || 'nyayasetu-master-key-32-byte-secret-2026-safe',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 300,
  authRateLimitMaxRequests: 15,
  env: process.env.NODE_ENV || 'development',
  // PostgreSQL Configuration
  databaseUrl: process.env.DATABASE_URL,
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: parseInt(process.env.PGPORT || '5432', 10),
  pgUser: process.env.PGUSER || 'postgres',
  pgPassword: process.env.PGPASSWORD || 'postgres',
  pgDatabase: process.env.PGDATABASE || 'nyayasetu_db',
  pgSsl: process.env.PGSSL === 'true',
};

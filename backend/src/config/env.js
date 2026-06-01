import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const useInMemoryDb = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Centralised, validated environment configuration.
 *
 * Production fails fast if a required secret/URI is missing. Development boots
 * zero-config: JWT secrets fall back to insecure dev defaults (with a warning),
 * and the DB can run fully in-memory (`npm run dev:memory`) — so a reviewer can
 * unzip → npm install → npm run dev:memory with no .env file at all.
 */
const required = [];
if (isProd) required.push('JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET');
// A real database connection string is always needed unless using in-memory mode.
if (!useInMemoryDb) required.push('MONGODB_URI');

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`\n[config] Missing required environment variable(s): ${missing.join(', ')}`);
  if (missing.includes('MONGODB_URI')) {
    console.error('[config] Set MONGODB_URI in backend/.env, OR run `npm run dev:memory` for a zero-setup in-memory database.');
  } else {
    console.error('[config] Copy .env.example to .env and fill in the values.');
  }
  console.error('');
  process.exit(1);
}

// Dev-only fallback secrets so the app runs without a .env. Never reached in
// production — the check above exits first when secrets are absent.
let warnedDevSecret = false;
const devSecret = (name, fallback) => {
  if (process.env[name]) return process.env[name];
  if (!warnedDevSecret) {
    // eslint-disable-next-line no-console
    console.warn('[config] ⚠ Using INSECURE default JWT secrets (development only). Set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET for real use.');
    warnedDevSecret = true;
  }
  return fallback;
};

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: toInt(process.env.PORT, 5000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  useInMemoryDb,
  mongoUri: process.env.MONGODB_URI,

  jwt: {
    accessSecret: devSecret('JWT_ACCESS_SECRET', 'dev-insecure-access-secret-change-me'),
    refreshSecret: devSecret('JWT_REFRESH_SECRET', 'dev-insecure-refresh-secret-change-me'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  rateLimit: {
    windowMinutes: toInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME || 'Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@primetrade.ai',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};

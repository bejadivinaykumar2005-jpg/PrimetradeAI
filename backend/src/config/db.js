import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Holds the in-memory MongoDB instance (dev only) so it can be stopped on shutdown.
let memoryServer = null;

/**
 * Resolve the connection string. In `USE_IN_MEMORY_DB=true` mode we lazily spin up
 * an ephemeral MongoDB via mongodb-memory-server — zero local install, great for
 * trying the project or running tests. Otherwise we use the real MONGODB_URI
 * (MongoDB Atlas or a locally/remotely installed MongoDB).
 */
async function resolveUri() {
  if (!env.useInMemoryDb) return env.mongoUri;

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  logger.warn('Using in-memory MongoDB (data is NOT persisted across restarts)');
  return uri;
}

/**
 * Connect to MongoDB with sensible production defaults and retry-friendly logging.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  const uri = await resolveUri();
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  logger.info('MongoDB connection closed');
}

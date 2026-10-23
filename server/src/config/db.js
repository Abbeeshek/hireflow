import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let memoryServer = null;

export const connectDB = async (uriOverride = null) => {
  const uri = uriOverride || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hireflow';

  try {
    // Attempt standard connection with serverSelectionTimeoutMS
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`[Database] Connected to MongoDB at ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (err) {
    console.warn(`[Database] Direct connection to ${uri} failed (${err.message}).`);

    // In non-production, fall back to MongoMemoryServer so the app runs without external setup
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Starting in-memory MongoDB fallback server...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'hireflow'
          }
        });
        const memoryUri = memoryServer.getUri();
        await mongoose.connect(memoryUri);
        console.log(`[Database] Connected to fallback MongoDB at ${memoryUri}`);
        return mongoose.connection;
      } catch (memErr) {
        console.error('[Database] Failed to start fallback MongoDB:', memErr.message);
        throw memErr;
      }
    } else {
      throw err;
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log('[Database] Disconnected');
  } catch (err) {
    console.error('[Database] Disconnect error:', err.message);
  }
};

export default connectDB;

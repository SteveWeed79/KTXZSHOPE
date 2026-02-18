/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// We use 'global as any' to maintain the connection during development
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      console.log('✅ MongoDB Connected Successfully');

      // Ensure stripe_events records expire automatically after 30 days.
      // Without this index, idempotency records accumulate forever.
      // createIndex is idempotent — safe to run on every cold start.
      try {
        await mongooseInstance.connection
          .collection('stripe_events')
          .createIndex(
            { claimedAt: 1 },
            { expireAfterSeconds: 30 * 24 * 60 * 60, background: true }
          );
      } catch (err) {
        // Non-fatal: log and continue. Common causes: index already exists
        // with a different TTL value (requires manual drop + recreate).
        console.warn('⚠️  stripe_events TTL index skipped:', (err as Error)?.message);
      }

      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
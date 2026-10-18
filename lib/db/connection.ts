import mongoose, { Connection } from "mongoose";
import { config } from "@/lib/config";
import { appLogger } from "@/lib/logging";
import { AppError } from "@/lib/errors";

interface MongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseGlobal: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseGlobal || { conn: null, promise: null };
if (!global.mongooseGlobal) {
  global.mongooseGlobal = cached;
}

/**
 * Authoritative Mongoose Connection Manager for Grocerly.
 * Ensures connection reuse across serverless requests, rejects unconfigured states,
 * and fails safely without falling back to mock persistence.
 */
export async function connectToDatabase(): Promise<Connection> {
  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) {
    appLogger.error("CRITICAL: MONGODB_URI is not configured.");
    throw new AppError("Database configuration is missing. MONGODB_URI must be provided.", 503, "DATABASE_UNAVAILABLE");
  }

  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      dbName: process.env.MONGODB_DB_NAME || config.MONGODB_DB_NAME || "grocerly",
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        appLogger.info({ db: opts.dbName }, "MongoDB connected successfully.");
        return m.connection;
      })
      .catch((err) => {
        cached.promise = null;
        appLogger.error({ err: err instanceof Error ? err.message : String(err) }, "MongoDB connection error.");
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw new AppError(
      "Database connection failed. Ensure MongoDB is running and MONGODB_URI is reachable.",
      503,
      "DATABASE_UNAVAILABLE"
    );
  }
}

export async function checkDbHealth(): Promise<{
  status: "connected" | "disconnected" | "connecting" | "unconfigured";
  pingMs?: number;
  dbName?: string;
  error?: string;
}> {
  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) {
    return { status: "unconfigured" };
  }

  let readyState = mongoose.connection.readyState;
  if (readyState === 0) {
    try {
      await connectToDatabase();
      readyState = mongoose.connection.readyState;
    } catch (err) {
      return {
        status: "disconnected",
        error: err instanceof Error ? err.message : "Connection attempt failed",
      };
    }
  }

  if (readyState === 1) {
    const start = Date.now();
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      return {
        status: "connected",
        pingMs: Date.now() - start,
        dbName: mongoose.connection.name,
      };
    } catch (err) {
      return {
        status: "connected",
        error: err instanceof Error ? err.message : "Ping failed",
      };
    }
  }

  if (readyState === 2) {
    return { status: "connecting" };
  }

  return { status: "disconnected" };
}

export async function disconnectDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

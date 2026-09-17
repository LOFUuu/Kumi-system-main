import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

// Cache the connection across hot reloads in development to avoid exhausting
// the server's connection pool.
declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

async function dbConnect(): Promise<typeof mongoose> {
  // Only short-circuit once fully connected. During the "connecting" state
  // (readyState === 2) we must await the pending connect promise, otherwise a
  // query can run before the connection settles and fail with
  // `bufferCommands = false` (Mongoose does not buffer buffering-disabled
  // queries while still connecting).
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return mongoose;

  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(MONGODB_URI!, { bufferCommands: false });
  }

  try {
    await global._mongooseConn;
  } catch (e) {
    // Allow a retry on the next call instead of keeping a rejected promise.
    global._mongooseConn = undefined;
    throw e;
  }

  return mongoose;
}

export default dbConnect;

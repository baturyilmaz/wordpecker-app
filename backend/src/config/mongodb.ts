import mongoose from 'mongoose';
import { environment } from './environment';

if (!environment.mongodbUrl) {
  throw new Error('Missing MongoDB configuration. Check MONGODB_URL in .env');
}

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 0,
  retryWrites: true,
  retryReads: true,
};

let connectionPromise: Promise<typeof mongoose> | null = null;
let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  });
  mongoose.connection.on('disconnected', () => {
    connectionPromise = null;
    console.warn('MongoDB disconnected.');
  });
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected.'));
};

// Connect to MongoDB with retry logic
export const connectDB = async (retries = 1, delay = 5000): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  registerConnectionListeners();
  connectionPromise = (async () => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to connect to MongoDB... (attempt ${i + 1}/${retries})`);
        const connection = await mongoose.connect(environment.mongodbUrl as string, mongoOptions);
        console.log('Connected to MongoDB successfully.');
        return connection;
      } catch (error) {
        console.error('MongoDB connection attempt failed.', {
          attempt: i + 1,
          retries,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });

        if (i === retries - 1) {
          throw Object.assign(new Error('Failed to connect to MongoDB.'), { cause: error });
        }

        console.log(`Retrying MongoDB connection in ${delay / 1000} seconds.`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Failed to connect to MongoDB.');
  })();

  try {
    return await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};

// Close MongoDB connection
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    connectionPromise = null;
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

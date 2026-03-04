import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

/**
 * Connects to MongoDB with optimizations for serverless (Vercel).
 * - Uses maxPoolSize=1 in serverless to avoid connection exhaustion.
 * - Tracks connection state to avoid redundant reconnections across warm invocations.
 */
export async function connectToDatabase(): Promise<void> {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    // Log masked URI for debugging (never expose password)
    const maskedURI = env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    console.log('Connecting to MongoDB:', maskedURI);

    try {
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: env.IS_VERCEL ? 1 : 10,
        });
        isConnected = true;
        console.log('✅ Connected to MongoDB successfully');
    } catch (err) {
        isConnected = false;
        console.error('❌ MongoDB connection error:', err);
        throw err;
    }
}

/**
 * Express middleware that ensures a DB connection exists before processing the request.
 */
export const requireDB = async (req: any, res: any, next: any) => {
    try {
        await connectToDatabase();
        next();
    } catch (err: any) {
        console.error('Failed to connect to database:', err);
        res.status(500).json({
            status: 'error',
            message: 'No se pudo conectar a la base de datos',
        });
    }
};

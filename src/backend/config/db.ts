import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { env } from './env.js';

/**
 * Connects to MongoDB with optimizations for serverless (Vercel).
 * - Uses maxPoolSize=1 in serverless to avoid connection exhaustion.
 * - Tracks connection state to avoid redundant reconnections across warm invocations.
 */
export async function connectToDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
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
        console.log('✅ Connected to MongoDB successfully');
    } catch (err) {
        // Solo nombre + mensaje: el error completo del driver puede incluir
        // la connection string con credenciales.
        const name    = err instanceof Error ? err.name : 'Error';
        const message = err instanceof Error ? err.message.replace(/:([^@\s]+)@/, ':****@') : String(err);
        console.error(`❌ MongoDB connection error: ${name} — ${message}`);
        throw err;
    }
}

/**
 * Express middleware that ensures a DB connection exists before processing the request.
 */
export const requireDB = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('Failed to connect to database:', err instanceof Error ? err.message : String(err));
        // 503 Service Unavailable: la dependencia (MongoDB) no responde, no es un bug del servidor
        res.status(503).json({
            status: 'error',
            message: 'Servicio temporalmente no disponible. Inténtalo de nuevo en unos segundos.',
        });
    }
};

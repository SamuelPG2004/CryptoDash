import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Custom application error with HTTP status code.
 * Use this for known, operational errors (e.g., "user not found", "insufficient balance").
 */
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Centralized error-handling middleware for Express.
 * Must be registered AFTER all routes with app.use(errorHandler).
 *
 * Handles:
 * - ZodError (input validation failures) → 400
 * - AppError (known operational errors) → custom statusCode
 * - Unknown errors → 500 (details hidden from client)
 */
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    // Zod validation errors
    if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        return res.status(400).json({
            status: 'error',
            message: 'Datos de entrada inválidos',
            errors: formattedErrors,
        });
    }

    // Known operational errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({
            status: 'error',
            message: 'Ya existe un registro con esos datos',
        });
    }

    // Unknown / unexpected errors — log full details, return generic message
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
    });
};

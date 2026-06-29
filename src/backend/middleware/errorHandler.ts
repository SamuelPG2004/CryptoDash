/**
 * @fileoverview errorHandler — Middleware centralizado de manejo de errores para Express.
 *
 * REFACTORIZACIÓN APLICADA:
 *
 *  ✅ Eliminado `any` en la firma del middleware:
 *     Express requiere `(err: unknown, ...)` — el tipo `any` era un bypass peligroso
 *     que ocultaba errores de tipado en tiempo de compilación.
 *
 *  ✅ Agregado manejo de errores de Mongoose:
 *     - `CastError` (ObjectId inválido) → 400 con mensaje descriptivo
 *     - `ValidationError` → 400 con campo y mensaje por cada campo inválido
 *     Estos errores son muy comunes en producción y deben tener respuestas claras.
 *
 *  ✅ Guard de encabezados ya enviados:
 *     Si `res.headersSent === true` (stream parcialmente enviado), se delega a Express
 *     en lugar de intentar escribir una segunda respuesta (que causaría un crash silencioso).
 *
 *  ✅ Nivel de log diferenciado:
 *     Errores operacionales (AppError) → `logger.warn` (esperados, no alertan on-call)
 *     Errores inesperados (500)        → `logger.error` (alertan on-call en producción)
 *
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import { logger } from '../utils/logger.js';

// ─── AppError ─────────────────────────────────────────────────────────────────

/**
 * Error de aplicación con código HTTP.
 * Úsalo para errores operacionales conocidos (saldo insuficiente, usuario no encontrado...).
 * El mensaje se expone al cliente — asegúrate de que no contenga detalles internos.
 */
export class AppError extends Error {
    /** Código de estado HTTP a devolver */
    readonly statusCode:    number;
    /** `true` — diferencia errores operacionales de bugs inesperados en los logs */
    readonly isOperational: true = true;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.name       = 'AppError';
        // Mantiene el stack trace correcto en V8
        Error.captureStackTrace(this, this.constructor);
    }
}

// ─── Tipos internos ────────────────────────────────────────────────────────────

/** Estructura de respuesta de error estándar de la API */
interface ErrorResponse {
    status:   'error';
    message:  string;
    errors?:  Array<{ field: string; message: string }>;
}

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Middleware centralizado de manejo de errores para Express.
 * DEBE registrarse DESPUÉS de todas las rutas: `app.use(errorHandler)`.
 *
 * Jerarquía de manejo (orden de precedencia):
 *  1. ZodError            → 400 + lista de campos inválidos
 *  2. AppError            → statusCode del error + mensaje
 *  3. Mongoose CastError  → 400 + "ID inválido"
 *  4. Mongoose Validation → 400 + campos del modelo inválidos
 *  5. Duplicate key (11000) → 400 + "registro duplicado"
 *  6. Todo lo demás       → 500 + mensaje genérico (detalles solo en logs)
 */
export const errorHandler = (
    err:  unknown,
    req:  Request,
    res:  Response,
    next: NextFunction,
): void => {
    // Guard: si los headers ya fueron enviados, delegar a Express default handler
    if (res.headersSent) {
        next(err);
        return;
    }

    const send = (status: number, body: ErrorResponse): void => {
        res.status(status).json(body);
    };

    // ── 1. ZodError — fallo de validación de input ──────────────────────────
    if (err instanceof ZodError) {
        const errors = err.issues.map(issue => ({
            field:   issue.path.join('.') || 'body',
            message: issue.message,
        }));
        send(400, {
            status:  'error',
            message: 'Datos de entrada inválidos',
            errors,
        });
        return;
    }

    // ── 2. AppError — error operacional conocido ────────────────────────────
    if (err instanceof AppError) {
        logger.warn('AppError', {
            statusCode: err.statusCode,
            message:    err.message,
            path:       req.path,
        });
        send(err.statusCode, {
            status:  'error',
            message: err.message,
        });
        return;
    }

    // ── 3. Mongoose CastError — ObjectId malformado ─────────────────────────
    if (err instanceof MongooseError.CastError) {
        send(400, {
            status:  'error',
            message: `ID inválido: ${err.value}`,
        });
        return;
    }

    // ── 4. Mongoose ValidationError — fallo de schema ──────────────────────
    if (err instanceof MongooseError.ValidationError) {
        const errors = Object.values(err.errors).map(e => ({
            field:   e.path,
            message: e.message,
        }));
        send(400, {
            status:  'error',
            message: 'Los datos no cumplen los requisitos del esquema',
            errors,
        });
        return;
    }

    // ── 5. Duplicate key (MongoDB) — email/campo único duplicado ───────────
    if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: number }).code === 11000
    ) {
        send(400, {
            status:  'error',
            message: 'Ya existe un registro con esos datos',
        });
        return;
    }

    // ── 6. Error inesperado — log completo, respuesta genérica ────────────
    const unknownErr = err instanceof Error ? err : new Error(String(err));
    logger.error('Error inesperado', {
        message: unknownErr.message,
        stack:   unknownErr.stack,
        path:    req.path,
        method:  req.method,
    });

    send(500, {
        status:  'error',
        message: 'Error interno del servidor',
    });
};

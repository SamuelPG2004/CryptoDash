import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers to catch unhandled promise rejections
 * and forward them to Express's centralized error handler.
 *
 * Express 4 does NOT catch async rejections automatically — without this wrapper,
 * an unhandled rejection in an async handler would crash the process.
 */
type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncFunction): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

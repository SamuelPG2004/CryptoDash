import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * If validation fails, the ZodError is forwarded to the centralized error handler.
 * If validation passes, req.body is replaced with the parsed (and potentially transformed) data.
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return next(result.error); // Caught by errorHandler middleware
        }
        req.body = result.data; // Replace with parsed/transformed data
        next();
    };
};

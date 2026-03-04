/**
 * Wraps async route handlers to catch unhandled promise rejections
 * and forward them to Express's centralized error handler.
 *
 * Express 4 does NOT catch async rejections automatically — without this wrapper,
 * an unhandled rejection in an async handler would crash the process.
 */
type AsyncFunction = (req: any, res: any, next: any) => Promise<any>;

export const asyncHandler = (fn: AsyncFunction) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

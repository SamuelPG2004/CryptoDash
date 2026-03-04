import dotenv from 'dotenv';
dotenv.config();

export const env = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptodash',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    IS_VERCEL: !!process.env.VERCEL,
};

/**
 * Validates that critical environment variables are set.
 * Logs warnings for missing variables (never exposes values).
 */
export function validateEnv(): void {
    const missing: string[] = [];

    if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

    if (missing.length > 0) {
        const level = env.NODE_ENV === 'production' ? '❌' : '⚠️';
        console.error(`${level}  Missing critical env vars: ${missing.join(', ')}`);
    }

    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY not set — AI analysis will be unavailable');
    }

    console.log(`✅ Environment: ${env.NODE_ENV} | Vercel: ${env.IS_VERCEL}`);
}

import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// ─── Fatal guard: JWT_SECRET must be set in production ───────────────────────
// If missing, the app boots with a known secret making ALL tokens forgeable.
if (isProd && !process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET must be set in production. Exiting.');
    process.exit(1);
}

export const env = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptodash',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_only_secret_NOT_for_production',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'CryptoDash <onboarding@resend.dev>',
    CRON_SECRET: process.env.CRON_SECRET || '',
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
        const level = isProd ? '❌' : '⚠️';
        console.error(`${level}  Missing critical env vars: ${missing.join(', ')}`);
        // Already exited above for JWT_SECRET in production
    }

    if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️  GROQ_API_KEY not set — AI analysis will be unavailable');
    }

    // APP_URL sin configurar en producción rompe CORS (solo permitiría
    // localhost) y los enlaces de reset de contraseña apuntarían a localhost.
    if (isProd && !process.env.APP_URL) {
        console.error('❌  APP_URL not set in production — CORS and password-reset links will point to localhost');
        missing.push('APP_URL');
    }

    console.log(`✅ Environment: ${env.NODE_ENV} | Vercel: ${env.IS_VERCEL}`);
}

/**
 * @fileoverview auth.test.ts — Tests de integración para la API de autenticación.
 *
 * Usa Supertest para hacer requests HTTP reales contra la app Express.
 * La BD se conecta al mismo ReplicaSet in-memory que usan los tests de transactionService.
 *
 * CASOS CUBIERTOS:
 *  ✅ Registro exitoso → 201 + token JWT
 *  ✅ Registro duplicado → 400
 *  ✅ Login exitoso → 200 + token JWT
 *  ✅ Login con credenciales incorrectas → 400
 *  ✅ Input inválido (validación Zod) → 400
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import {
    connectTestDatabase,
    clearDatabase,
    disconnectTestDatabase,
} from './helpers/mongoTestHelper.js';

// ── Importamos la app de Express DESPUÉS de conectar la BD ────────────────────
// server.ts llama validateEnv() al importarse — necesitamos NODE_ENV=test en env
let app: Express.Application;

beforeAll(async () => {
    await connectTestDatabase();
    // Importación dinámica para que la BD ya esté conectada cuando server.ts se evalúe
    const serverModule = await import('../../../server.js');
    app = serverModule.default;
});

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(async () => {
    await clearDatabase();
});

// ─── Datos de registro base ───────────────────────────────────────────────────

const validRegisterPayload = {
    email:       'test@cryptodash.test',
    password:    'Password123!',
    fullName:    'Test User',
    age:         25,
    country:     'México',
    phoneNumber: '+52 555 000 0000',
    birthDate:   '2000-01-01',
    securityPin: '1234',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    it('debe registrar un nuevo usuario y devolver un token JWT', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(validRegisterPayload);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.email).toBe(validRegisterPayload.email);
        // Verificar que el password nunca se devuelve
        expect(res.body.password).toBeUndefined();
    });

    it('debe rechazar el registro con email duplicado → 400', async () => {
        await request(app).post('/api/auth/register').send(validRegisterPayload);
        const res = await request(app).post('/api/auth/register').send(validRegisterPayload);
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/ya existe/i);
    });

    it('debe rechazar input inválido con errores de Zod → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'not-an-email', password: '123' });  // Email inválido, password corta

        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(Array.isArray(res.body.errors)).toBe(true);
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        // Registrar un usuario para los tests de login
        await request(app).post('/api/auth/register').send(validRegisterPayload);
    });

    it('debe autenticar con credenciales correctas y devolver un token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: validRegisterPayload.email, password: validRegisterPayload.password });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.split('.').length).toBe(3);  // JWT tiene 3 partes separadas por punto
    });

    it('debe rechazar credenciales incorrectas → 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: validRegisterPayload.email, password: 'WrongPassword!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/credenciales/i);
    });

    it('debe rechazar email no registrado → 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@cryptodash.test', password: 'Password123!' });

        expect(res.statusCode).toBe(400);
    });
});

describe('GET /api/users/profile (protección de ruta)', () => {
    it('debe devolver 401 si no hay token de autenticación', async () => {
        const res = await request(app).get('/api/users/profile');
        expect(res.statusCode).toBe(401);
    });
});

// ─── Recuperación de contraseña ────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send(validRegisterPayload);
    });

    it('debe responder 200 con mensaje genérico para un email registrado', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: validRegisterPayload.email });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/si existe una cuenta/i);

        // El token (hasheado) debe quedar persistido en la BD
        const user = await mongoose.model('User')
            .findOne({ email: validRegisterPayload.email })
            .select('+resetPasswordToken +resetPasswordExpires');
        expect(user?.resetPasswordToken).toBeDefined();
        expect(user?.resetPasswordExpires?.getTime()).toBeGreaterThan(Date.now());
    });

    it('debe responder 200 con el MISMO mensaje para un email no registrado (anti-enumeración)', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'nobody@cryptodash.test' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/si existe una cuenta/i);
    });
});

describe('POST /api/auth/reset-password', () => {
    /** Inserta directamente un token de reset válido y devuelve el token en claro */
    async function seedResetToken(expiresInMs = 60 * 60 * 1000): Promise<string> {
        const rawToken = crypto.randomBytes(32).toString('hex');
        await mongoose.model('User').updateOne(
            { email: validRegisterPayload.email },
            {
                resetPasswordToken:   crypto.createHash('sha256').update(rawToken).digest('hex'),
                resetPasswordExpires: new Date(Date.now() + expiresInMs),
            },
        );
        return rawToken;
    }

    beforeEach(async () => {
        await request(app).post('/api/auth/register').send(validRegisterPayload);
    });

    it('debe cambiar la contraseña con un token válido y permitir login con la nueva', async () => {
        const rawToken = await seedResetToken();

        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: rawToken, password: 'NewPassword456!' });

        expect(res.statusCode).toBe(200);

        // La contraseña anterior ya no funciona
        const oldLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: validRegisterPayload.email, password: validRegisterPayload.password });
        expect(oldLogin.statusCode).toBe(400);

        // La nueva sí
        const newLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: validRegisterPayload.email, password: 'NewPassword456!' });
        expect(newLogin.statusCode).toBe(200);
        expect(newLogin.body).toHaveProperty('token');
    });

    it('debe invalidar el token tras usarlo (un solo uso)', async () => {
        const rawToken = await seedResetToken();

        await request(app)
            .post('/api/auth/reset-password')
            .send({ token: rawToken, password: 'NewPassword456!' });

        const secondAttempt = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: rawToken, password: 'AnotherPassword789!' });
        expect(secondAttempt.statusCode).toBe(400);
    });

    it('debe rechazar un token inexistente → 400', async () => {
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'a'.repeat(64), password: 'NewPassword456!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/inválido o ha expirado/i);
    });

    it('debe rechazar un token expirado → 400', async () => {
        const rawToken = await seedResetToken(-1_000);  // expiró hace 1 segundo

        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: rawToken, password: 'NewPassword456!' });

        expect(res.statusCode).toBe(400);
    });
});

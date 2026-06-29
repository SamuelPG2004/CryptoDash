/**
 * @fileoverview user.test.ts — Tests de integración para la API de usuarios.
 *
 * Complementa auth.test.ts: prueba los endpoints de perfil y acciones de usuario
 * que requieren autenticación JWT válida.
 *
 * CASOS CUBIERTOS:
 *  ✅ GET /profile sin token → 401
 *  ✅ GET /profile con token válido → 200 + datos de perfil
 *  ✅ POST /favorites → toggle de favorito
 *  ✅ POST /validate-pin → PIN correcto e incorrecto
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
    connectTestDatabase,
    clearDatabase,
    disconnectTestDatabase,
} from './helpers/mongoTestHelper.js';

let app: Express.Application;
let authToken: string;

const validRegisterPayload = {
    email:       'usertest@cryptodash.test',
    password:    'Password123!',
    fullName:    'Test User',
    age:         25,
    country:     'México',
    phoneNumber: '+52 555 000 0001',
    birthDate:   '2000-01-01',
    securityPin: '4321',
};

beforeAll(async () => {
    await connectTestDatabase();
    const serverModule = await import('../../../server.js');
    app = serverModule.default;
});

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(async () => {
    await clearDatabase();
    // Registrar y obtener token antes de cada test
    const res = await request(app)
        .post('/api/auth/register')
        .send(validRegisterPayload);
    authToken = res.body.token as string;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/users/profile', () => {
    it('debe devolver 401 sin token', async () => {
        const res = await request(app).get('/api/users/profile');
        expect(res.statusCode).toBe(401);
    });

    it('debe devolver el perfil con token válido', async () => {
        const res = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.email).toBe(validRegisterPayload.email);
        expect(res.body.wallet).toBe(10_000);  // wallet inicial por defecto
        // Verificar que campos sensibles no se devuelven
        expect(res.body.password).toBeUndefined();
        expect(res.body.securityPin).toBeUndefined();
    });
});

describe('POST /api/users/favorites', () => {
    it('debe agregar un favorito y devolverlo en la lista', async () => {
        const res = await request(app)
            .post('/api/users/favorites')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ cryptoId: 'bitcoin' });

        expect(res.statusCode).toBe(200);
        expect(res.body.favorites).toContain('bitcoin');
    });

    it('debe eliminar un favorito existente (toggle)', async () => {
        // Agregar primero
        await request(app)
            .post('/api/users/favorites')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ cryptoId: 'bitcoin' });

        // Luego eliminar (toggle)
        const res = await request(app)
            .post('/api/users/favorites')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ cryptoId: 'bitcoin' });

        expect(res.body.favorites).not.toContain('bitcoin');
    });
});

describe('POST /api/users/validate-pin', () => {
    it('debe validar correctamente un PIN correcto', async () => {
        const res = await request(app)
            .post('/api/users/validate-pin')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: validRegisterPayload.securityPin });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('debe rechazar un PIN incorrecto → 400', async () => {
        const res = await request(app)
            .post('/api/users/validate-pin')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: '9999' });

        expect(res.statusCode).toBe(400);
    });
});

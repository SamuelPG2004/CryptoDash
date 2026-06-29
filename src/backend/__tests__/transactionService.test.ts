/**
 * @fileoverview transactionService.test.ts — Tests de integración ACID para el servicio financiero.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ESTRATEGIA DE TESTING                                                       ║
 * ║                                                                               ║
 * ║  Tipo: Tests de INTEGRACIÓN (no unitarios)                                   ║
 * ║                                                                               ║
 * ║  Por qué integración y no unitario:                                          ║
 * ║   Los tests de unidad con mocks de Mongoose no pueden verificar las          ║
 * ║   garantías ACID reales — solo el comportamiento de la lógica. Para         ║
 * ║   garantizar que el ROLLBACK de la sesión restaura el wallet correctamente  ║
 * ║   en la BD real, necesitamos un MongoDB verdadero (aunque sea en memoria).  ║
 * ║                                                                               ║
 * ║  Infraestructura:                                                            ║
 * ║   - mongodb-memory-server (ReplicaSet de 1 nodo — requerido para ACID)      ║
 * ║   - vi.spyOn() de Vitest para simular fallos en medio de la transacción     ║
 * ║   - priceCache mockeado para evitar llamadas a CoinGecko en CI/CD           ║
 * ║                                                                               ║
 * ║  Cobertura de casos críticos:                                                ║
 * ║   ✅ Compra exitosa                                                           ║
 * ║   ✅ Venta exitosa                                                            ║
 * ║   ✅ Compra con saldo insuficiente → 0 cambios en BD                         ║
 * ║   ✅ Venta con holdings insuficientes → 0 cambios en BD                      ║
 * ║   ✅ Precio no disponible en caché → 503                                     ║
 * ║   ✅ ROLLBACK ACID: fallo en user.save() → wallet intacto                   ║
 * ║   ✅ Race condition simulada: dos compras concurrentes con saldo justo        ║
 * ║   ✅ Precio promedio ponderado correcto en compra adicional                   ║
 * ║   ✅ Eliminación de ítem del portfolio al vender todos los tokens             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module __tests__/transactionService.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { executeBuy, executeSell } from '../services/transactionService.js';
import { AppError } from '../middleware/errorHandler.js';
import * as priceCache from '../services/priceCache.js';
import {
    connectTestDatabase,
    clearDatabase,
    disconnectTestDatabase,
} from './helpers/mongoTestHelper.js';

// ─── Constantes de test ────────────────────────────────────────────────────────

/** Precio de Bitcoin simulado por el mock del priceCache */
const MOCK_BTC_PRICE = 50_000;

/** Wallet inicial del usuario de prueba */
const INITIAL_WALLET = 100_000;

/** Parámetros base para una operación de compra de BTC */
const BUY_PARAMS_BASE = {
    coinId: 'bitcoin',
    symbol: 'BTC',
    name:   'Bitcoin',
};

// ─── Setup y Teardown global ───────────────────────────────────────────────────

beforeAll(async () => {
    await connectTestDatabase();
});

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(async () => {
    await clearDatabase();

    // Mock del caché de precios — evita llamadas a CoinGecko en tests
    // Retorna MOCK_BTC_PRICE para 'bitcoin', null para todo lo demás
    vi.spyOn(priceCache, 'getVerifiedPrice').mockImplementation(
        async (coinId: string): Promise<number | null> => {
            if (coinId === 'bitcoin') return MOCK_BTC_PRICE;
            return null;
        }
    );
});

afterEach(() => {
    vi.restoreAllMocks();  // Limpia todos los spies después de cada test
});

// ─── Factory de usuario de prueba ─────────────────────────────────────────────

/**
 * Crea un usuario de prueba en la BD con datos mínimos válidos.
 * El bcrypt del pre-save hook se ejecuta normalmente — password y PIN hasheados.
 */
async function createTestUser(overrides: Partial<{
    wallet:    number;
    portfolio: { coinId: string; symbol: string; amount: number; averagePrice: number }[];
}> = {}): Promise<InstanceType<typeof User>> {
    return User.create({
        email:       `test_${Date.now()}@cryptodash.test`,
        password:    'TestPassword123!',
        fullName:    'Test User',
        age:         25,
        country:     'México',
        phoneNumber: '+52 123 456 7890',
        birthDate:   new Date('1999-01-01'),
        securityPin: '1234',
        wallet:      INITIAL_WALLET,
        portfolio:   [],
        ...overrides,
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — CASOS EXITOSOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('transactionService — Operaciones Exitosas', () => {

    it('executeBuy: debe deducir el wallet y agregar el ítem al portfolio', async () => {
        const user   = await createTestUser();
        const amount = 0.5;  // 0.5 BTC
        const expectedCost  = amount * MOCK_BTC_PRICE; // $25,000

        const { user: result, transaction } = await executeBuy({
            userId: user._id.toString(),
            amount,
            ...BUY_PARAMS_BASE,
        });

        // ── Verificar wallet ─────────────────────────────────────────────────
        expect(result.wallet).toBeCloseTo(INITIAL_WALLET - expectedCost);

        // ── Verificar portfolio ──────────────────────────────────────────────
        const safeUser = result as Record<string, unknown>;
        const portfolio = safeUser.portfolio as Array<Record<string, unknown>>;
        const btcItem = portfolio.find(p => p.coinId === 'bitcoin');
        expect(btcItem).toBeDefined();
        expect(btcItem!.amount).toBeCloseTo(amount);
        expect(btcItem!.averagePrice).toBeCloseTo(MOCK_BTC_PRICE);

        // ── Verificar transacción registrada en BD ───────────────────────────
        expect(transaction.type).toBe('buy');
        expect(transaction.coinId).toBe('bitcoin');
        expect(transaction.amount).toBeCloseTo(amount);
        expect(transaction.price).toBeCloseTo(MOCK_BTC_PRICE);
        expect(transaction.totalUSD).toBeCloseTo(expectedCost);

        // ── Verificar en la BD directamente (no solo en memoria) ─────────────
        const dbUser = await User.findById(user._id);
        expect(dbUser!.wallet).toBeCloseTo(INITIAL_WALLET - expectedCost);

        const dbTx = await Transaction.findById(transaction._id);
        expect(dbTx).not.toBeNull();
    });

    it('executeBuy: debe calcular el precio promedio ponderado al comprar más del mismo activo', async () => {
        // Usuario con 1 BTC comprado a $40,000
        const initialBtcAmount   = 1;
        const initialAvgPrice    = 40_000;
        const user = await createTestUser({
            wallet:    INITIAL_WALLET,
            portfolio: [{ coinId: 'bitcoin', symbol: 'BTC', amount: initialBtcAmount, averagePrice: initialAvgPrice }],
        });

        const additionalBuy = 1;  // Comprar 1 BTC más a $50,000 (precio actual del mock)

        const { user: result } = await executeBuy({
            userId: user._id.toString(),
            amount: additionalBuy,
            ...BUY_PARAMS_BASE,
        });

        // Precio promedio esperado: (1 × 40,000 + 1 × 50,000) / 2 = $45,000
        const expectedAvgPrice = (initialBtcAmount * initialAvgPrice + additionalBuy * MOCK_BTC_PRICE) /
                                  (initialBtcAmount + additionalBuy);

        const portfolio = (result as Record<string, unknown>).portfolio as Array<Record<string, unknown>>;
        const btcItem   = portfolio.find(p => p.coinId === 'bitcoin');
        expect(btcItem!.amount as number).toBeCloseTo(initialBtcAmount + additionalBuy);
        expect(btcItem!.averagePrice as number).toBeCloseTo(expectedAvgPrice);
    });

    it('executeSell: debe acreditar el wallet y reducir el portfolio', async () => {
        const initialBtcAmount = 2;
        const sellAmount       = 0.5;
        const user = await createTestUser({
            portfolio: [{ coinId: 'bitcoin', symbol: 'BTC', amount: initialBtcAmount, averagePrice: 45_000 }],
        });

        const { user: result } = await executeSell({
            userId: user._id.toString(),
            coinId: 'bitcoin',
            name:   'Bitcoin',
            amount: sellAmount,
        });

        const expectedEarnings = sellAmount * MOCK_BTC_PRICE; // $25,000
        expect(result.wallet as number).toBeCloseTo(INITIAL_WALLET + expectedEarnings);

        const portfolio = (result as Record<string, unknown>).portfolio as Array<Record<string, unknown>>;
        const btcItem   = portfolio.find(p => p.coinId === 'bitcoin');
        expect(btcItem!.amount as number).toBeCloseTo(initialBtcAmount - sellAmount);
    });

    it('executeSell: debe eliminar el ítem del portfolio al vender todos los tokens', async () => {
        const user = await createTestUser({
            portfolio: [{ coinId: 'bitcoin', symbol: 'BTC', amount: 1, averagePrice: 45_000 }],
        });

        const { user: result } = await executeSell({
            userId: user._id.toString(),
            coinId: 'bitcoin',
            name:   'Bitcoin',
            amount: 1,  // Vender EXACTAMENTE todo
        });

        const portfolio = (result as Record<string, unknown>).portfolio as Array<Record<string, unknown>>;
        const btcItem   = portfolio.find(p => p.coinId === 'bitcoin');

        // El ítem debe haber sido eliminado del portfolio (no solo puesto en 0)
        expect(btcItem).toBeUndefined();
    });

    it('executeBuy: no debe exponer password ni securityPin en el resultado', async () => {
        const user   = await createTestUser();
        const { user: result } = await executeBuy({
            userId: user._id.toString(),
            amount: 0.1,
            ...BUY_PARAMS_BASE,
        });

        // Garantía de seguridad: los campos sensibles nunca llegan al controlador
        expect((result as Record<string, unknown>).password).toBeUndefined();
        expect((result as Record<string, unknown>).securityPin).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — VALIDACIONES Y ERRORES ESPERADOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('transactionService — Validaciones y Rechazos', () => {

    it('executeBuy: debe rechazar con 400 si el saldo es insuficiente', async () => {
        const user        = await createTestUser({ wallet: 100 });  // Solo $100
        const buyAmount   = 1;  // 1 BTC = $50,000 → insuficiente

        await expect(
            executeBuy({ userId: user._id.toString(), amount: buyAmount, ...BUY_PARAMS_BASE })
        ).rejects.toThrow(AppError);

        const thrown = await executeBuy({
            userId: user._id.toString(), amount: buyAmount, ...BUY_PARAMS_BASE,
        }).catch(e => e);

        expect(thrown).toBeInstanceOf(AppError);
        expect(thrown.statusCode).toBe(400);
        expect(thrown.message).toMatch(/saldo insuficiente/i);
    });

    it('executeBuy con saldo insuficiente: el wallet debe quedar EXACTAMENTE igual en la BD', async () => {
        const user = await createTestUser({ wallet: 100 });

        // Capturamos el error pero verificamos el estado de la BD
        await executeBuy({
            userId: user._id.toString(), amount: 1, ...BUY_PARAMS_BASE,
        }).catch(() => { /* esperado */ });

        const dbUser = await User.findById(user._id);
        expect(dbUser!.wallet).toBe(100);  // Sin cambios

        const txCount = await Transaction.countDocuments({ userId: user._id });
        expect(txCount).toBe(0);  // Sin transacciones registradas
    });

    it('executeSell: debe rechazar con 400 si el usuario no tiene ese activo', async () => {
        const user = await createTestUser();  // Portfolio vacío

        await expect(
            executeSell({ userId: user._id.toString(), coinId: 'bitcoin', name: 'Bitcoin', amount: 1 })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('executeSell: debe rechazar con 400 si los holdings son insuficientes', async () => {
        const user = await createTestUser({
            portfolio: [{ coinId: 'bitcoin', symbol: 'BTC', amount: 0.1, averagePrice: 45_000 }],
        });

        const error = await executeSell({
            userId: user._id.toString(), coinId: 'bitcoin', name: 'Bitcoin', amount: 5,  // > 0.1
        }).catch(e => e);

        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(400);
        expect(error.message).toMatch(/insuficientes/i);

        // Verificar que el portfolio quedó intacto
        const dbUser = await User.findById(user._id);
        expect(dbUser!.portfolio[0].amount).toBeCloseTo(0.1);
    });

    it('executeBuy: debe rechazar con 503 si el precio no está disponible en el caché', async () => {
        // Override: getVerifiedPrice devuelve null para 'bitcoin' en este test
        vi.spyOn(priceCache, 'getVerifiedPrice').mockResolvedValue(null);

        const user = await createTestUser();
        const error = await executeBuy({
            userId: user._id.toString(), amount: 1, ...BUY_PARAMS_BASE,
        }).catch(e => e);

        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(503);
    });

    it('executeBuy: debe rechazar con 404 si el userId no existe', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const error  = await executeBuy({
            userId: fakeId, amount: 1, ...BUY_PARAMS_BASE,
        }).catch(e => e);

        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(404);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — GARANTÍAS ACID (EL TEST MÁS CRÍTICO DEL SISTEMA)
// ═══════════════════════════════════════════════════════════════════════════════

describe('transactionService — Garantías ACID de Rollback', () => {

    it('ACID CRÍTICO: si user.save() falla durante executeBuy, el wallet debe quedar intacto', async () => {
        /**
         * ESCENARIO:
         *  1. findOneAndUpdate deduce $25,000 del wallet (paso 1 de la TX)
         *  2. user.save() falla con un error simulado (paso 2 — DESPUÉS de la deducción)
         *  3. La sesión ACID hace ROLLBACK
         *  4. El wallet debe quedar exactamente en $100,000 — sin perder ni un centavo
         *
         * CÓMO FUNCIONA EL MOCK:
         *  Interceptamos el prototipo de Document.save para que falle SOLO
         *  durante la ejecución de executeBuy, restaurándolo después del test.
         *
         * SIN SESIONES ACID (código original), este test fallaría porque:
         *  - findOneAndUpdate ya habría deducido los $25,000
         *  - user.save() falla → la deducción no se revierte
         *  - El usuario pierde dinero sin recibir los tokens
         */
        const user   = await createTestUser({ wallet: INITIAL_WALLET });
        const amount = 0.5;  // Costaría $25,000

        // Spy que falla en la primera llamada a save() dentro de la transacción
        // (findOneAndUpdate no usa .save(), solo el segundo paso de actualizar portfolio sí)
        const saveSpy = vi.spyOn(
            User.prototype,
            'save'
        ).mockRejectedValueOnce(new Error('Simulated DB failure during save — testing ACID rollback'));

        // Ejecutar la compra — DEBE fallar
        const error = await executeBuy({
            userId: user._id.toString(),
            amount,
            ...BUY_PARAMS_BASE,
        }).catch(e => e);

        // ── 1. El error debe ser un AppError (relanzado por el bloque catch) ──
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(500);
        expect(error.message).toMatch(/no fue afectado/i);

        // ── 2. LA GARANTÍA PRINCIPAL: el wallet en la BD debe ser exactamente el original ──
        const dbUser = await User.findById(user._id);
        expect(dbUser!.wallet).toBe(INITIAL_WALLET);
        // Sin margen de error — si hay un centavo de diferencia, el ACID falló

        // ── 3. El portfolio debe estar vacío (no se agregó el activo) ──────────
        expect(dbUser!.portfolio).toHaveLength(0);

        // ── 4. No debe existir ninguna transacción registrada ─────────────────
        const txCount = await Transaction.countDocuments({ userId: user._id });
        expect(txCount).toBe(0);

        saveSpy.mockRestore();
    });

    it('ACID CRÍTICO: si Transaction.create() falla, el wallet debe hacer rollback completo', async () => {
        /**
         * ESCENARIO:
         *  1. findOneAndUpdate deduce el wallet ✓
         *  2. user.save() actualiza el portfolio ✓
         *  3. Transaction.create() FALLA (e.g., BD saturada, error de validación)
         *  4. ROLLBACK → wallet y portfolio vuelven al estado original
         *
         * Este es el fallo más silencioso sin ACID:
         *  El usuario vería sus tokens en el portfolio pero el historial estaría incompleto
         *  Y su dinero ya habría sido deducido.
         */
        const user = await createTestUser({ wallet: INITIAL_WALLET });

        // Mock: Transaction.create lanza un error
        const createSpy = vi.spyOn(Transaction, 'create').mockRejectedValueOnce(
            new Error('Simulated Transaction.create failure — testing ACID rollback')
        );

        const error = await executeBuy({
            userId: user._id.toString(),
            amount: 0.5,
            ...BUY_PARAMS_BASE,
        }).catch(e => e);

        expect(error).toBeInstanceOf(AppError);

        // GARANTÍA: wallet completamente intacto
        const dbUser = await User.findById(user._id);
        expect(dbUser!.wallet).toBe(INITIAL_WALLET);
        expect(dbUser!.portfolio).toHaveLength(0);

        createSpy.mockRestore();
    });

    it('ACID: si executeSell falla a mitad, el wallet y el portfolio deben quedar intactos', async () => {
        const initialBtcAmount = 2;
        const user = await createTestUser({
            portfolio: [{ coinId: 'bitcoin', symbol: 'BTC', amount: initialBtcAmount, averagePrice: 45_000 }],
        });

        // Forzar fallo en save() durante la venta
        vi.spyOn(User.prototype, 'save').mockRejectedValueOnce(
            new Error('Simulated DB failure during sell — testing ACID rollback')
        );

        await executeSell({
            userId: user._id.toString(),
            coinId: 'bitcoin',
            name:   'Bitcoin',
            amount: 1,
        }).catch(() => { /* esperado */ });

        // Wallet sin cambios — no se acreditaron los fondos de la venta
        const dbUser = await User.findById(user._id);
        expect(dbUser!.wallet).toBe(INITIAL_WALLET);

        // Portfolio sin cambios — los tokens no desaparecieron
        expect(dbUser!.portfolio[0].amount).toBeCloseTo(initialBtcAmount);

        // Sin transacciones registradas
        const txCount = await Transaction.countDocuments({ userId: user._id });
        expect(txCount).toBe(0);

        vi.restoreAllMocks();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — CONSISTENCIA BAJO CONCURRENCIA
// ═══════════════════════════════════════════════════════════════════════════════

describe('transactionService — Resistencia a Race Conditions', () => {

    it('dos compras concurrentes con saldo exacto: solo una debe ser exitosa', async () => {
        /**
         * ESCENARIO DE RACE CONDITION:
         *  Usuario tiene $50,000. Dos requests de compra de 1 BTC ($50,000) llegan
         *  simultáneamente. Sin la condición atómica $gte en findOneAndUpdate,
         *  ambas podrían pasar el check de saldo y gastar $100,000 del wallet de $50,000.
         *
         * La condición `wallet: { $gte: totalCost }` en el filtro de findOneAndUpdate
         * garantiza que solo UNA de las dos puede decrementar el wallet.
         */
        const user = await createTestUser({ wallet: MOCK_BTC_PRICE }); // Exactamente $50,000

        // Ejecutar ambas compras en paralelo
        const results = await Promise.allSettled([
            executeBuy({ userId: user._id.toString(), amount: 1, ...BUY_PARAMS_BASE }),
            executeBuy({ userId: user._id.toString(), amount: 1, ...BUY_PARAMS_BASE }),
        ]);

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected  = results.filter(r => r.status === 'rejected');

        // EXACTAMENTE una compra exitosa, una rechazada
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        // El wallet debe ser 0 (no negativo)
        const dbUser = await User.findById(user._id);
        expect(dbUser!.wallet).toBeGreaterThanOrEqual(0);
        expect(dbUser!.wallet).toBeLessThan(MOCK_BTC_PRICE); // Se gastó algo

        // El portfolio debe tener exactamente 1 BTC (no 2)
        const btcHolding = dbUser!.portfolio.find(p => p.coinId === 'bitcoin');
        expect(btcHolding?.amount).toBeCloseTo(1);

        // Exactamente 1 transacción registrada
        const txCount = await Transaction.countDocuments({ userId: user._id });
        expect(txCount).toBe(1);
    });
});

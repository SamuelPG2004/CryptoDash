/**
 * @fileoverview transactionService — Capa de lógica de negocio para operaciones financieras.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PRINCIPIO CRÍTICO: ACID con Sesiones de MongoDB                        ║
 * ║                                                                          ║
 * ║  Todas las operaciones financieras (compra/venta) se ejecutan dentro    ║
 * ║  de una sesión de MongoDB con `session.startTransaction()`.             ║
 * ║                                                                          ║
 * ║  Garantías ACID que esto provee:                                        ║
 * ║  • Atomicity:   Si cualquier paso falla, TODO hace rollback.           ║
 * ║  • Consistency: El wallet NUNCA queda en estado negativo.              ║
 * ║  • Isolation:   Otras sesiones no ven cambios parciales.               ║
 * ║  • Durability:  Al hacer commit, los cambios son permanentes.          ║
 * ║                                                                          ║
 * ║  PREREQUISITO: MongoDB debe estar corriendo en modo ReplicaSet.        ║
 * ║  Las transacciones multi-documento NO funcionan en standalone.          ║
 * ║  En Atlas (producción), esto es el default. En local, ver README.       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * RESPONSABILIDADES:
 *  - Verificar precio de mercado desde el caché del servidor
 *  - Validar saldo/holdings antes de operar
 *  - Ejecutar la operación dentro de una sesión ACID
 *  - Registrar la transacción en el historial
 *  - Emitir notificación por WebSocket al usuario
 *  - Registrar auditoría en logs
 *
 * SEPARACIÓN DE RESPONSABILIDADES:
 *  - El controlador (`userController.ts`) recibe la request HTTP y delega aquí.
 *  - Este servicio no sabe nada de HTTP (sin Request, Response, status codes).
 *  - Los errores se lanzan como `AppError` para que el controlador los propague.
 *
 * @module services/transactionService
 */

import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { getVerifiedPrice } from './priceCache.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import type { IPortfolioItem } from '../models/User.js';
import type { ITransaction } from '../models/Transaction.js';

// ─── Tipos de dominio ──────────────────────────────────────────────────────────

/**
 * Parámetros de entrada para una operación de compra.
 */
export interface BuyParams {
    /** ID del usuario autenticado */
    userId:  string;
    /** ID de la moneda (slug de CoinGecko) */
    coinId:  string;
    /** Símbolo ticker en mayúsculas */
    symbol:  string;
    /** Nombre completo de la moneda */
    name:    string;
    /** Cantidad de tokens a comprar */
    amount:  number;
    /** Instancia de Socket.IO para notificaciones en tiempo real */
    io?:     SocketIOServer;
}

/**
 * Parámetros de entrada para una operación de venta.
 */
export interface SellParams {
    userId:  string;
    coinId:  string;
    /** Símbolo ticker (opcional — se recupera del portfolio si no se provee) */
    symbol?: string;
    name:    string;
    amount:  number;
    io?:     SocketIOServer;
}

/**
 * Resultado de una operación exitosa de compra o venta.
 * El controlador retorna este objeto directamente en la respuesta HTTP.
 */
export interface TradeResult {
    /** Documento del usuario actualizado (sin password ni PIN) */
    user:        Record<string, unknown>;
    /** Registro de la transacción creada */
    transaction: ITransaction;
}

// ─── Utilidades internas ───────────────────────────────────────────────────────

/**
 * Calcula el nuevo precio promedio ponderado tras una compra adicional.
 * Fórmula: (cantidadAnterior × precioAnterior + nuevaCantidad × nuevoPrecio) / totalCantidad
 *
 * @param currentItem - Ítem actual del portfolio
 * @param buyAmount   - Cantidad adicional comprada
 * @param buyPrice    - Precio de compra actual
 * @returns Nuevo precio promedio ponderado
 */
function calculateWeightedAveragePrice(
    currentItem: IPortfolioItem,
    buyAmount:   number,
    buyPrice:    number,
): number {
    const totalAmount = currentItem.amount + buyAmount;
    const totalCost   = (currentItem.amount * currentItem.averagePrice) + (buyAmount * buyPrice);
    return totalCost / totalAmount;
}

/**
 * Emite una notificación de transacción por WebSocket al usuario.
 * Falla silenciosamente — los errores de socket nunca deben romper la operación.
 *
 * @param io          - Instancia de Socket.IO
 * @param userId      - ID del usuario destinatario
 * @param type        - Tipo de operación
 * @param transaction - Documento de transacción a enviar
 */
function emitTransactionNotification(
    io:          SocketIOServer,
    userId:      string,
    type:        'buy' | 'sell',
    transaction: ITransaction,
): void {
    try {
        io.to(userId).emit('transaction', { type, transaction });
    } catch (socketErr: unknown) {
        logger.warn('transactionService: fallo al emitir notificación WebSocket', {
            userId,
            type,
            error: socketErr instanceof Error ? socketErr.message : String(socketErr),
        });
    }
}

// ─── Lógica de negocio de compra ──────────────────────────────────────────────

/**
 * Ejecuta una compra de criptomoneda con garantías ACID completas.
 *
 * FLUJO DE LA TRANSACCIÓN:
 *  1. Obtiene el precio verificado del servidor (nunca del cliente)
 *  2. Abre sesión de MongoDB y startTransaction()
 *  3. Deduce el wallet con condición atómica (wallet >= totalCost)
 *  4. Actualiza el portfolio dentro de la misma sesión
 *  5. Registra la Transaction dentro de la misma sesión
 *  6. commitTransaction() — todos los cambios se persisten atómicamente
 *  7. En caso de error: abortTransaction() → rollback completo
 *
 * @param params - Parámetros de la compra
 * @returns TradeResult con el usuario actualizado y la transacción creada
 *
 * @throws {AppError} 503 — Precio no disponible en caché
 * @throws {AppError} 400 — Saldo insuficiente o usuario no encontrado
 * @throws {AppError} 500 — Error interno de base de datos
 */
export async function executeBuy(params: BuyParams): Promise<TradeResult> {
    const { userId, coinId, symbol, name, amount, io } = params;

    // ── 1. Verificar precio en caché del servidor ──────────────────────────
    const price = await getVerifiedPrice(coinId);
    if (!price) {
        throw new AppError(
            'No se pudo verificar el precio actual. El mercado puede estar temporalmente no disponible.',
            503,
        );
    }

    const totalCost = amount * price;

    // ── 2. Abrir sesión ACID de MongoDB ────────────────────────────────────
    const session = await mongoose.startSession();

    try {
        session.startTransaction({
            readConcern:    { level: 'snapshot' },
            writeConcern:   { w: 'majority' },
            maxCommitTimeMS: 10_000,
        });

        // ── 3. Deducir wallet con condición atómica ────────────────────────
        // El filtro `wallet: { $gte: totalCost }` es la barrera contra
        // race conditions: si dos compras concurrentes corren en paralelo,
        // solo una puede pasar este filtro satisfactoriamente.
        const userAfterDeduction = await User.findOneAndUpdate(
            { _id: userId, wallet: { $gte: totalCost } },
            { $inc: { wallet: -totalCost } },
            { new: true, session },
        );

        if (!userAfterDeduction) {
            // Distinguimos "usuario no existe" de "saldo insuficiente"
            const userExists = await User.exists({ _id: userId }).session(session);
            if (!userExists) {
                throw new AppError('Usuario no encontrado', 404);
            }
            throw new AppError(
                `Saldo insuficiente. Necesitas $${totalCost.toFixed(2)} pero solo tienes $${
                    (await User.findById(userId).select('wallet').session(session))?.wallet?.toFixed(2) ?? '0.00'
                }`,
                400,
            );
        }

        // ── 4. Actualizar portfolio dentro de la sesión ────────────────────
        const itemIndex = userAfterDeduction.portfolio.findIndex(p => p.coinId === coinId);

        if (itemIndex > -1) {
            const currentItem = userAfterDeduction.portfolio[itemIndex];
            userAfterDeduction.portfolio[itemIndex].averagePrice = calculateWeightedAveragePrice(
                currentItem,
                amount,
                price,
            );
            userAfterDeduction.portfolio[itemIndex].amount += amount;
        } else {
            userAfterDeduction.portfolio.push({ coinId, symbol, amount, averagePrice: price });
        }

        await userAfterDeduction.save({ session });

        // ── 5. Registrar transacción dentro de la sesión ───────────────────
        const [transaction] = await Transaction.create(
            [{
                userId:   userAfterDeduction._id,
                type:     'buy',
                coinId,
                symbol,
                name:     name || coinId,
                amount,
                price,
                totalUSD: totalCost,
            }],
            { session },
        );

        // ── 6. Commit atómico — todo o nada ───────────────────────────────
        await session.commitTransaction();

        // ── Post-commit: notificaciones y auditoría (fuera de la sesión) ──
        if (io) {
            emitTransactionNotification(io, userId, 'buy', transaction);
        }

        logger.audit('CRYPTO_BUY', userId, {
            coinId,
            symbol,
            amount,
            price,
            totalCost,
            newWalletBalance: userAfterDeduction.wallet,
        });

        // Devolver usuario sin campos sensibles
        const safeUser = userAfterDeduction.toObject() as unknown as Record<string, unknown>;
        delete safeUser.password;
        delete safeUser.securityPin;

        return { user: safeUser, transaction };

    } catch (err: unknown) {
        // ── Rollback completo ante cualquier error ─────────────────────────
        await session.abortTransaction();

        logger.error('transactionService.executeBuy: abortTransaction ejecutado', {
            userId,
            coinId,
            amount,
            error: err instanceof Error ? err.message : String(err),
        });

        // Re-lanzar AppError sin envolver (el controlador lo pasa a errorHandler)
        if (err instanceof AppError) throw err;

        throw new AppError('Error interno al procesar la compra. Tu saldo no fue afectado.', 500);

    } finally {
        // La sesión SIEMPRE se cierra, independientemente del resultado
        await session.endSession();
    }
}

// ─── Lógica de negocio de venta ───────────────────────────────────────────────

/**
 * Ejecuta una venta de criptomoneda con garantías ACID completas.
 *
 * FLUJO DE LA TRANSACCIÓN:
 *  1. Obtiene el precio verificado del servidor
 *  2. Abre sesión de MongoDB y startTransaction()
 *  3. Verifica holdings del usuario dentro de la sesión
 *  4. Actualiza portfolio y wallet dentro de la misma sesión
 *  5. Registra la Transaction dentro de la misma sesión
 *  6. commitTransaction()
 *  7. En caso de error: abortTransaction() → rollback completo
 *
 * @param params - Parámetros de la venta
 * @returns TradeResult con el usuario actualizado y la transacción creada
 *
 * @throws {AppError} 503 — Precio no disponible
 * @throws {AppError} 404 — Usuario no encontrado
 * @throws {AppError} 400 — Holdings insuficientes
 * @throws {AppError} 500 — Error interno de base de datos
 */
export async function executeSell(params: SellParams): Promise<TradeResult> {
    const { userId, coinId, symbol: reqSymbol, name, amount, io } = params;

    // ── 1. Verificar precio en caché del servidor ──────────────────────────
    const price = await getVerifiedPrice(coinId);
    if (!price) {
        throw new AppError(
            'No se pudo verificar el precio actual. El mercado puede estar temporalmente no disponible.',
            503,
        );
    }

    const totalEarnings = amount * price;

    // ── 2. Abrir sesión ACID de MongoDB ────────────────────────────────────
    const session = await mongoose.startSession();

    try {
        session.startTransaction({
            readConcern:    { level: 'snapshot' },
            writeConcern:   { w: 'majority' },
            maxCommitTimeMS: 10_000,
        });

        // ── 3. Cargar usuario y verificar holdings dentro de la sesión ─────
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const itemIndex = user.portfolio.findIndex(p => p.coinId === coinId);

        if (itemIndex === -1) {
            throw new AppError(`No tienes ${reqSymbol ?? coinId} en tu portfolio`, 400);
        }

        const currentHolding = user.portfolio[itemIndex];
        if (currentHolding.amount < amount) {
            throw new AppError(
                `Holdings insuficientes. Tienes ${currentHolding.amount.toFixed(6)} ${currentHolding.symbol} ` +
                `pero intentas vender ${amount.toFixed(6)}.`,
                400,
            );
        }

        const symbol = reqSymbol ?? currentHolding.symbol;

        // ── 4. Actualizar portfolio y wallet dentro de la sesión ───────────
        user.wallet += totalEarnings;
        user.portfolio[itemIndex].amount -= amount;

        // Si se vendió todo, eliminar la entrada del portfolio
        if (user.portfolio[itemIndex].amount === 0) {
            user.portfolio.splice(itemIndex, 1);
        }

        await user.save({ session });

        // ── 5. Registrar transacción dentro de la sesión ───────────────────
        const [transaction] = await Transaction.create(
            [{
                userId:   user._id,
                type:     'sell',
                coinId,
                symbol,
                name:     name || coinId,
                amount,
                price,
                totalUSD: totalEarnings,
            }],
            { session },
        );

        // ── 6. Commit atómico ──────────────────────────────────────────────
        await session.commitTransaction();

        // ── Post-commit: notificaciones y auditoría ────────────────────────
        if (io) {
            emitTransactionNotification(io, userId, 'sell', transaction);
        }

        logger.audit('CRYPTO_SELL', userId, {
            coinId,
            symbol,
            amount,
            price,
            totalEarnings,
            newWalletBalance: user.wallet,
        });

        const safeUser = user.toObject() as unknown as Record<string, unknown>;
        delete safeUser.password;
        delete safeUser.securityPin;

        return { user: safeUser, transaction };

    } catch (err: unknown) {
        // ── Rollback completo ──────────────────────────────────────────────
        await session.abortTransaction();

        logger.error('transactionService.executeSell: abortTransaction ejecutado', {
            userId,
            coinId,
            amount,
            error: err instanceof Error ? err.message : String(err),
        });

        if (err instanceof AppError) throw err;

        throw new AppError('Error interno al procesar la venta. Tu saldo no fue afectado.', 500);

    } finally {
        await session.endSession();
    }
}

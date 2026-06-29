/**
 * @fileoverview alertChecker — Servicio de verificación de alertas de precio en background.
 *
 * REFACTORIZACIÓN APLICADA:
 *
 *  ✅ Eliminada llamada duplicada a CoinGecko:
 *     La versión original hacía su propio `axios.get` a CoinGecko cada 5 minutos,
 *     duplicando la cuota de API y creando precios inconsistentes con el resto del sistema.
 *     Ahora consume `getCachedPrices()` del `priceCache` compartido — única fuente de verdad.
 *
 *  ✅ Tipado estricto:
 *     Eliminado `any` — usa `IAlert` y `IUser` de los modelos actualizados.
 *     `latestPrices` ahora es un Map (O(1) lookup vs. O(n) con object bracket access).
 *
 *  ✅ Guard de instancia única:
 *     `isRunning` previene que `startAlertChecker()` arranque múltiples intervalos si se
 *     llama más de una vez (e.g., por hot-reload en desarrollo).
 *
 *  ✅ Graceful shutdown:
 *     `stopAlertChecker()` exportada para uso en tests y en shutdown hooks del servidor.
 *
 *  ✅ Logs de auditoría mejorados:
 *     Cada alerta disparada ahora incluye userId, símbolo, condición y precio para
 *     trazabilidad completa en producción.
 *
 * NOTA ARQUITECTÓNICA — MongoDB ReplicaSet:
 *  Las sesiones ACID de transactionService requieren ReplicaSet.
 *  alertChecker no usa transacciones (solo marca `alert.active = false`) — el
 *  riesgo de doble-disparo es bajo y aceptable para esta fase. Si se requiere
 *  garantía de exactly-once delivery, agregar una sesión aquí también.
 *
 * @module services/alertChecker
 */

import User from '../models/User.js';
import { connectToDatabase } from '../config/db.js';
import { getCachedPrices } from './priceCache.js';
import { logger } from '../utils/logger.js';
import type { Server as SocketIOServer } from 'socket.io';
import type { IAlert, IUser } from '../models/User.js';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Intervalo de verificación — alineado con el TTL del priceCache (5 minutos) */
const ALERT_CHECK_INTERVAL_MS = 5 * 60 * 1_000;

// ─── Estado del servicio ───────────────────────────────────────────────────────

/** Handle del intervalo activo. `null` si el servicio no está corriendo. */
let intervalHandle: NodeJS.Timeout | null = null;

/** Guard de instancia única — previene múltiples intervalos en hot-reload */
let isRunning = false;

// ─── Lógica de verificación ────────────────────────────────────────────────────

/**
 * Construye un mapa `coinId → precio` a partir del caché compartido de precios.
 * Usa Map en lugar de objeto para O(1) lookup garantizado.
 *
 * @returns Map de precios actuales por coinId
 */
async function buildPriceMap(): Promise<Map<string, number>> {
    const coins = await getCachedPrices();
    const map   = new Map<string, number>();

    for (const coin of coins) {
        if (coin.id && typeof coin.price === 'number') {
            map.set(coin.id, coin.price);
        }
    }

    return map;
}

/**
 * Determina si una alerta se ha disparado dados los precios actuales.
 *
 * @param alert        - La alerta a evaluar
 * @param currentPrice - El precio actual del coin en USD
 * @returns `true` si la condición de la alerta se cumple
 */
function isAlertTriggered(alert: IAlert, currentPrice: number): boolean {
    return (
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice)
    );
}

/**
 * Emite una notificación WebSocket al usuario cuando se dispara su alerta.
 * Falla silenciosamente — los errores de socket nunca deben interrumpir el ciclo.
 *
 * @param io           - Instancia de Socket.IO
 * @param userId       - ID del usuario destinatario
 * @param alert        - La alerta disparada
 * @param currentPrice - Precio actual que disparó la alerta
 */
function emitAlertNotification(
    io:           SocketIOServer,
    userId:       string,
    alert:        IAlert,
    currentPrice: number,
): void {
    try {
        io.to(userId).emit('alert', {
            coinId:      alert.coinId,
            symbol:      alert.symbol,
            condition:   alert.condition,
            targetPrice: alert.targetPrice,
            currentPrice,
            triggeredAt: new Date().toISOString(),
        });
    } catch (socketErr: unknown) {
        logger.warn('[AlertChecker] WebSocket emit failed', {
            userId,
            coinId: alert.coinId,
            error:  socketErr instanceof Error ? socketErr.message : String(socketErr),
        });
    }
}

/**
 * Ejecuta un ciclo completo de verificación de alertas:
 *  1. Obtiene precios del caché compartido (no hace llamada a CoinGecko)
 *  2. Consulta usuarios con alertas activas
 *  3. Verifica condiciones y desactiva alertas disparadas
 *  4. Emite notificaciones por WebSocket
 *
 * @param io - Instancia de Socket.IO (opcional)
 */
async function runAlertCheckCycle(io?: SocketIOServer): Promise<void> {
    // ── 1. Obtener precios del caché compartido ──────────────────────────────
    let priceMap: Map<string, number>;
    try {
        priceMap = await buildPriceMap();
    } catch (err: unknown) {
        logger.warn('[AlertChecker] No se pudo obtener el caché de precios, saltando ciclo', {
            error: err instanceof Error ? err.message : String(err),
        });
        return;
    }

    if (priceMap.size === 0) {
        logger.warn('[AlertChecker] Caché de precios vacío, saltando ciclo');
        return;
    }

    // ── 2. Consultar usuarios con alertas activas ────────────────────────────
    let users: IUser[];
    try {
        await connectToDatabase();
        // El índice `alerts.active` (definido en User.ts) hace esta query O(log n)
        users = await User.find({ 'alerts.active': true }).select('alerts email fullName');
    } catch (dbErr: unknown) {
        logger.error('[AlertChecker] Error al consultar usuarios con alertas activas', {
            error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
        return;
    }

    let totalChecked   = 0;
    let totalTriggered = 0;

    // ── 3. Verificar alertas de cada usuario ─────────────────────────────────
    for (const user of users) {
        let userModified = false;

        for (const alert of user.alerts) {
            if (!alert.active) continue;
            totalChecked++;

            const currentPrice = priceMap.get(alert.coinId);
            if (currentPrice === undefined) continue;  // Moneda no en el Top 50

            if (!isAlertTriggered(alert, currentPrice)) continue;

            // ── Alerta disparada ─────────────────────────────────────────────
            alert.active  = false;
            userModified  = true;
            totalTriggered++;

            logger.audit('ALERT_TRIGGERED', user._id.toString(), {
                coinId:      alert.coinId,
                symbol:      alert.symbol,
                condition:   alert.condition,
                targetPrice: alert.targetPrice,
                currentPrice,
            });

            // ── Notificación WebSocket (post-mutación, pre-save) ─────────────
            if (io) {
                emitAlertNotification(io, user._id.toString(), alert, currentPrice);
            }
        }

        // Solo guarda el documento si algo cambió — reduce escrituras a MongoDB
        if (userModified) {
            try {
                await user.save();
            } catch (saveErr: unknown) {
                logger.error('[AlertChecker] Error al guardar alertas disparadas', {
                    userId: user._id.toString(),
                    error:  saveErr instanceof Error ? saveErr.message : String(saveErr),
                });
            }
        }
    }

    if (totalChecked > 0 || totalTriggered > 0) {
        logger.info(`[AlertChecker] Ciclo completo — ${totalChecked} alertas verificadas, ${totalTriggered} disparadas`);
    }
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Inicia el servicio de verificación de alertas en background.
 *
 * - Ejecuta un ciclo inmediatamente al iniciar (no espera el primer intervalo).
 * - Guard de instancia única: si ya está corriendo, no crea un segundo intervalo.
 * - Safe para hot-reload en desarrollo.
 *
 * @param io - Instancia de Socket.IO para notificaciones en tiempo real
 */
export function startAlertChecker(io?: SocketIOServer): void {
    if (isRunning) {
        logger.warn('[AlertChecker] Ya está en ejecución — ignorando llamada duplicada');
        return;
    }

    isRunning = true;
    logger.info('[AlertChecker] Iniciando servicio de alertas de precio...');

    const run = (): void => {
        // Ejecutar sin await — el ciclo es independiente y no debe bloquear el event loop
        runAlertCheckCycle(io).catch((err: unknown) => {
            logger.error('[AlertChecker] Error no capturado en runAlertCheckCycle', {
                error: err instanceof Error ? err.message : String(err),
            });
        });
    };

    run(); // Primera ejecución inmediata
    intervalHandle = setInterval(run, ALERT_CHECK_INTERVAL_MS);
}

/**
 * Detiene el servicio de verificación de alertas.
 * Útil para tests de integración y graceful shutdown del servidor.
 */
export function stopAlertChecker(): void {
    if (intervalHandle !== null) {
        clearInterval(intervalHandle);
        intervalHandle = null;
        isRunning      = false;
        logger.info('[AlertChecker] Servicio detenido');
    }
}

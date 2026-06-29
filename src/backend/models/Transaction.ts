/**
 * @fileoverview Transaction — Modelo de Mongoose para el historial de operaciones.
 *
 * CAMBIOS vs. versión anterior:
 *  - Agregado índice compuesto `{ userId, createdAt }` para el historial paginado
 *    del usuario (GET /transactions) — evita full scan.
 *  - `amount` y `price` con `min: 0` para integridad a nivel de esquema.
 *  - Tipo `ITransaction` mejorado con campo `name` no opcional.
 *
 * NOTA DE ARQUITECTURA:
 *  Las transacciones son registros inmutables de auditoría. Nunca se modifican
 *  ni eliminan. En un sistema de producción real se añadiría:
 *    - Campo `status`: 'completed' | 'failed' | 'pending'
 *    - Campo `sessionId`: referencia a la sesión de MongoDB que la creó
 *    - Campo `fee`: comisión de la plataforma
 *
 * @module models/Transaction
 */

import mongoose, { Document, Model } from 'mongoose';

// ─── Interfaz del documento ───────────────────────────────────────────────────

export interface ITransaction extends Document {
    /** ID del usuario que realizó la operación */
    userId:    mongoose.Types.ObjectId;
    /** Tipo de operación */
    type:      'buy' | 'sell';
    /** ID de la moneda (slug de CoinGecko, e.g. "bitcoin") */
    coinId:    string;
    /** Símbolo ticker en mayúsculas (e.g. "BTC") */
    symbol:    string;
    /** Nombre completo de la moneda */
    name:      string;
    /** Cantidad de tokens operados */
    amount:    number;
    /** Precio verificado por el servidor en el momento de la operación */
    price:     number;
    /** Total en USD de la operación (amount × price) */
    totalUSD:  number;
    /** Timestamp de creación (provisto por `timestamps: true`) */
    createdAt: Date;
}

// ─── Esquema ──────────────────────────────────────────────────────────────────

const transactionSchema = new mongoose.Schema<ITransaction>({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
    },
    type: {
        type:     String,
        enum:     ['buy', 'sell'],
        required: true,
    },
    coinId: { type: String, required: true },
    symbol: { type: String, required: true },
    name:   { type: String, required: true, default: '' },
    amount: {
        type:     Number,
        required: true,
        min:      [0, 'La cantidad no puede ser negativa'],
    },
    price: {
        type:     Number,
        required: true,
        min:      [0, 'El precio no puede ser negativo'],
    },
    totalUSD: {
        type:     Number,
        required: true,
        min:      [0, 'El total USD no puede ser negativo'],
    },
}, {
    timestamps: true,
});

// ─── Índices ──────────────────────────────────────────────────────────────────

// Índice principal: historial de transacciones del usuario ordenado por fecha desc
// Cubre: GET /api/transactions?userId=X&limit=20&sort=-createdAt
transactionSchema.index({ userId: 1, createdAt: -1 });

// Índice secundario para filtrar por moneda dentro del historial de un usuario
transactionSchema.index({ userId: 1, coinId: 1 });

// ─── Modelo ───────────────────────────────────────────────────────────────────

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;

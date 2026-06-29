/**
 * @fileoverview User — Modelo de Mongoose para usuarios de CryptoDash.
 *
 * CAMBIOS vs. versión anterior:
 *  - Exportado `IPortfolioItem` como tipo standalone → usado por transactionService
 *    para tipado estricto sin depender del tipo completo `IUser`.
 *  - Exportado `IAlert` como tipo standalone → usado por alertChecker sin importar IUser.
 *  - Agregado índice compuesto `{ 'portfolio.coinId': 1 }` para las búsquedas de
 *    portfolio en operaciones de compra/venta (O(log n) vs O(n) full scan).
 *  - Agregado `min: 0` en `portfolio[].amount` para integridad a nivel de esquema.
 *  - `wallet` con `min: 0` para prevenir saldos negativos a nivel de BD.
 *
 * @module models/User
 */

import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Tipos exportados (reutilizables sin importar IUser completo) ─────────────

/**
 * Ítem del portfolio del usuario.
 * Exportado para uso en transactionService sin acoplamiento a IUser.
 */
export interface IPortfolioItem {
    coinId:       string;
    symbol:       string;
    amount:       number;
    averagePrice: number;
}

/**
 * Alerta de precio del usuario.
 * Exportado para uso en alertChecker sin acoplamiento a IUser.
 */
export interface IAlert {
    id:          string;
    coinId:      string;
    symbol:      string;
    condition:   'above' | 'below';
    targetPrice: number;
    active:      boolean;
}

// ─── Interfaz principal del documento ────────────────────────────────────────

export interface IUser extends Document {
    email:       string;
    password:    string;
    fullName:    string;
    age:         number;
    country:     string;
    phoneNumber: string;
    birthDate:   Date;
    securityPin: string;
    favorites:   string[];
    /** Saldo virtual en USD. Nunca puede ser negativo. */
    wallet:      number;
    portfolio:   IPortfolioItem[];
    alerts:      IAlert[];
    createdAt:   Date;
    comparePassword: (password: string) => Promise<boolean>;
    comparePin:      (pin: string)      => Promise<boolean>;
}

// ─── Esquema ──────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema<IUser>({
    email: {
        type:     String,
        required: true,
        unique:   true,
        trim:     true,
        lowercase: true,
    },
    password:    { type: String, required: true },
    fullName:    { type: String, required: true },
    age:         { type: Number, required: true, min: 18 },
    country:     { type: String, required: true },
    phoneNumber: { type: String, required: true },
    birthDate:   { type: Date,   required: true },
    securityPin: { type: String, required: true },
    favorites:   { type: [String], default: [] },
    wallet: {
        type:    Number,
        default: 10_000.0,
        min:     [0, 'El saldo de la wallet no puede ser negativo'],  // Integridad a nivel BD
    },
    portfolio: [{
        coinId:       { type: String, required: true },
        symbol:       { type: String, required: true },
        amount:       { type: Number, required: true, default: 0, min: 0 },
        averagePrice: { type: Number, required: true, default: 0 },
    }],
    alerts: [{
        id:          { type: String, required: true },
        coinId:      { type: String, required: true },
        symbol:      { type: String, required: true },
        condition:   { type: String, required: true, enum: ['above', 'below'] },
        targetPrice: { type: Number, required: true },
        active:      { type: Boolean, default: true },
    }],
}, {
    timestamps: true,
});

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Hashea password y PIN antes de guardar (solo si fueron modificados) */
userSchema.pre<IUser>('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    if (this.isModified('securityPin')) {
        this.securityPin = await bcrypt.hash(this.securityPin, 10);
    }
});

// ─── Métodos de instancia ────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
    return bcrypt.compare(candidatePin, this.securityPin);
};

// ─── Índices ──────────────────────────────────────────────────────────────────

// Índices para alertChecker (evita full scan en cada ciclo de 5 minutos)
userSchema.index({ 'alerts.active': 1 });
userSchema.index({ 'alerts.coinId': 1 });

// Índice para búsquedas de portfolio en buy/sell (O(log n))
userSchema.index({ 'portfolio.coinId': 1 });

// ─── Modelo ───────────────────────────────────────────────────────────────────

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;

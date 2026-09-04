import { z } from 'zod';

export const updateProfileSchema = z.object({
    pin: z.string().min(4, 'PIN requerido'),
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    age: z.number().int().min(18, 'Debes tener al menos 18 años').optional(),
    country: z.string().min(1, 'País inválido').optional(),
    phoneNumber: z.string().min(5, 'Teléfono inválido').optional(),
    birthDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha inválida').optional(),
});

export const updatePasswordSchema = z.object({
    pin: z.string().min(4, 'PIN requerido'),
    newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const validatePinSchema = z.object({
    pin: z.string().min(4, 'PIN requerido'),
});

export const toggleFavoriteSchema = z.object({
    cryptoId: z.string().min(1, 'ID de criptomoneda requerido'),
});

/**
 * Alerta de precio. Era el único endpoint de escritura sin validación Zod:
 * un cliente podía inyectar strings ilimitados o precios negativos/Infinity.
 */
export const addAlertSchema = z.object({
    coinId:      z.string().min(1).max(100, 'ID de moneda inválido'),
    symbol:      z.string().min(1).max(20, 'Símbolo inválido'),
    condition:   z.enum(['above', 'below']),
    targetPrice: z.number().positive('El precio objetivo debe ser mayor que 0').finite(),
});

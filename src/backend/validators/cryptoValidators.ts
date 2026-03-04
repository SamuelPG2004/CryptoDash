import { z } from 'zod';

export const buySchema = z.object({
    coinId: z.string().min(1, 'ID de moneda requerido'),
    symbol: z.string().min(1, 'Símbolo requerido'),
    amount: z.number().positive('La cantidad debe ser positiva'),
    price: z.number().positive('El precio debe ser positivo'),
});

export const sellSchema = z.object({
    coinId: z.string().min(1, 'ID de moneda requerido'),
    amount: z.number().positive('La cantidad debe ser positiva'),
    price: z.number().positive('El precio debe ser positivo'),
});

export const analyzeSchema = z.object({
    coinName: z.string().min(1, 'Nombre de moneda requerido'),
    coinSymbol: z.string().min(1, 'Símbolo requerido'),
    currentPrice: z.number().positive('Precio debe ser positivo'),
    change24h: z.number(),
});

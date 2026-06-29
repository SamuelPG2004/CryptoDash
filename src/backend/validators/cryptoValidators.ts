import { z } from 'zod';

export const buySchema = z.object({
    coinId: z.string().min(1, 'ID de moneda requerido').max(100),
    symbol: z.string().min(1, 'Símbolo requerido').max(20),
    name:   z.string().optional().default(''),
    amount: z.number()
        .positive('La cantidad debe ser positiva')
        .max(1_000_000, 'La cantidad excede el límite máximo permitido'),
    // NOTA: el precio NO se acepta del cliente — el servidor lo verifica
    //       desde su caché (getVerifiedPrice). Esto previene price-injection attacks.
});

export const sellSchema = z.object({
    coinId: z.string().min(1, 'ID de moneda requerido').max(100),
    symbol: z.string().optional(),
    name:   z.string().optional().default(''),
    amount: z.number()
        .positive('La cantidad debe ser positiva')
        .max(1_000_000, 'La cantidad excede el límite máximo permitido'),
    // NOTA: el precio NO se acepta del cliente — mismo motivo que buySchema.
});

export const analyzeSchema = z.object({
    coinName: z.string().min(1, 'Nombre de moneda requerido'),
    coinSymbol: z.string().min(1, 'Símbolo requerido'),
    currentPrice: z.number().positive('Precio debe ser positivo'),
    change24h: z.number(),
});

// Schema para POST /api/news/market-analyze (usado por MarketAnalyzer.tsx)
export const marketAnalyzeSchema = z.object({
    symbol:    z.string().min(1, 'Símbolo requerido').max(20).toUpperCase(),
    price:     z.coerce.number().positive('El precio debe ser positivo'),
    volume:    z.coerce.number().nonnegative('El volumen no puede ser negativo'),
    change24h: z.coerce.number(),
});

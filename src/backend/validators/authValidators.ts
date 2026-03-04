import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    age: z.number().int('La edad debe ser un número entero').min(18, 'Debes tener al menos 18 años'),
    country: z.string().min(1, 'País es requerido'),
    phoneNumber: z.string().min(5, 'Número de teléfono inválido'),
    birthDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha de nacimiento inválida'),
    securityPin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos numéricos'),
});

export const loginSchema = z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z.string().min(1, 'Contraseña requerida'),
});

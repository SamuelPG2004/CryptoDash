/**
 * @fileoverview cn — Utilidad de composición de clases CSS (punto único de verdad).
 *
 * Combina `clsx` (lógica condicional) con `tailwind-merge` (deduplicación de clases Tailwind).
 * Todos los componentes deben importar desde aquí — jamás redefinir localmente.
 *
 * @example
 * cn('text-white', isActive && 'bg-emerald-500', 'bg-zinc-900')
 * // Si isActive=true → 'text-white bg-emerald-500' (bg-zinc-900 descartada por twMerge)
 *
 * @module lib/cn
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases CSS con soporte para condicionales y deduplicación de Tailwind.
 *
 * @param inputs - Clases CSS, valores condicionales o arrays de clases
 * @returns String de clases CSS combinadas y deduplicadas
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

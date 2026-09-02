/**
 * @fileoverview emailService — Punto único de envío de correos transaccionales via Resend.
 *
 * Centraliza el envío de emails (bienvenida, recuperación de contraseña,
 * notificaciones de alertas) para que la configuración del proveedor,
 * el remitente y el manejo de errores vivan en un solo lugar.
 *
 * Si RESEND_API_KEY no está configurada, todos los envíos se omiten
 * silenciosamente (la app funciona sin correo en desarrollo).
 *
 * @module services/emailService
 */

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Escapa caracteres especiales de HTML para prevenir inyección de HTML
 * en correos cuando se interpolan valores provistos por el usuario
 * (nombre, símbolo de moneda, etc.).
 */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export interface EmailOptions {
    to:      string;
    subject: string;
    html:    string;
}

/**
 * Envía un correo transaccional. Nunca lanza: cualquier fallo se registra
 * y se devuelve `false` para que el flujo llamador decida cómo continuar.
 *
 * @returns `true` si el correo fue aceptado por Resend, `false` en cualquier otro caso.
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    if (!env.RESEND_API_KEY) {
        logger.warn('[EmailService] RESEND_API_KEY no configurada — correo omitido', { subject });
        return false;
    }

    try {
        // Import dinámico: evita cargar el SDK de Resend en arranque si no se usa
        const { Resend } = await import('resend');
        const resend = new Resend(env.RESEND_API_KEY);

        const { error } = await resend.emails.send({
            from: env.EMAIL_FROM,
            to,
            subject,
            html,
        });

        if (error) {
            logger.error('[EmailService] Resend rechazó el envío', { subject, error: error.message });
            return false;
        }

        return true;
    } catch (err: unknown) {
        logger.error('[EmailService] Error enviando correo', {
            subject,
            error: err instanceof Error ? err.message : String(err),
        });
        return false;
    }
}

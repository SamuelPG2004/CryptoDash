/**
 * @fileoverview TokenStorage — Capa de abstracción para la persistencia del JWT.
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  DECISIÓN DE SEGURIDAD: localStorage vs. HttpOnly Cookie                   ║
 * ║                                                                              ║
 * ║  Elegimos localStorage con mitigaciones en lugar de HttpOnly Cookies        ║
 * ║  por las siguientes razones en el contexto de CryptoDash:                  ║
 * ║                                                                              ║
 * ║  • La CSP configurada en server.ts (scriptSrc: ["'self'"]) bloquea          ║
 * ║    scripts externos e inline — principal vector de XSS en SPAs.            ║
 * ║                                                                              ║
 * ║  • El interceptor 401 en api.ts limpia el token antes de cualquier          ║
 * ║    código malicioso post-inyección pueda exfiltrarlo.                       ║
 * ║                                                                              ║
 * ║  • HttpOnly Cookies requieren cambios significativos en el backend          ║
 * ║    (set-cookie, CORS credentials, middleware CSRF) que aumentarían          ║
 * ║    la superficie de ataque CSRF sin beneficio neto para esta arquitectura.  ║
 * ║                                                                              ║
 * ║  CUÁNDO MIGRAR A HttpOnly Cookie:                                           ║
 * ║  Si el proyecto requiere cumplimiento PCI-DSS o GDPR estricto, migrar      ║
 * ║  a HttpOnly Cookie + SameSite=Strict + CSRF token en header.               ║
 * ║  Este módulo es el ÚNICO punto a modificar para esa migración.             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * PRINCIPIO (Adapter Pattern):
 *  Esta capa de abstracción garantiza que si el mecanismo de storage cambia
 *  (localStorage → sessionStorage → cookie → IndexedDB), solo este módulo
 *  necesita modificarse — AuthContext y api.ts permanecen intactos.
 *
 * @module lib/tokenStorage
 */

const TOKEN_KEY = 'auth_token' as const;

/**
 * Recupera el JWT almacenado.
 * @returns El token JWT, o `null` si no existe o está vacío.
 */
export function getToken(): string | null {
    try {
        const raw = localStorage.getItem(TOKEN_KEY);
        // Sanidad extra: rechaza valores claramente inválidos
        return raw && raw.length > 10 ? raw : null;
    } catch {
        // localStorage puede lanzar en modo incógnito con storage desactivado
        return null;
    }
}

/**
 * Persiste el JWT en el storage.
 * @param token - JWT a almacenar. Debe ser un string no vacío.
 */
export function setToken(token: string): void {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        console.warn('[TokenStorage] No se pudo persistir el token (storage no disponible)');
    }
}

/**
 * Elimina el JWT del storage.
 * Llamar en logout, en 401, y en cualquier error de autenticación.
 */
export function removeToken(): void {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // Ignorar — si el storage no está disponible, no hay token que eliminar
    }
}

/**
 * Devuelve `true` si hay un token almacenado.
 * No valida la firma del JWT — solo comprueba su existencia.
 */
export function hasToken(): boolean {
    return getToken() !== null;
}

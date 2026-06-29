/**
 * @fileoverview userController — Controlador HTTP para el dominio de usuarios.
 *
 * REFACTORIZACIÓN APLICADA (vs. versión original):
 *
 *  ✅ SRP — El controlador solo maneja HTTP:
 *     Extrae parámetros del request, delega al servicio, formatea la respuesta.
 *     La lógica financiera (ACID, portfolio, precios) vive en `transactionService`.
 *
 *  ✅ Transacciones ACID:
 *     `buyCrypto` y `sellCrypto` delegan a `executeBuy` / `executeSell` en
 *     `transactionService`, que usa sesiones de MongoDB con startTransaction()
 *     y rollback automático ante cualquier fallo.
 *
 *  ✅ Seguridad — Campos sensibles:
 *     Las respuestas de `buyCrypto` y `sellCrypto` usan el usuario saneado
 *     devuelto por el servicio (sin password ni securityPin).
 *
 *  ✅ Eliminado `req.user?.id` repetido sin null check:
 *     Helper `requireUserId()` extrae y valida el ID del usuario en un solo punto.
 *
 *  ✅ Tipado consistente:
 *     `next` importado y tipado correctamente. `error` capturado como `unknown`.
 *
 * @module controllers/userController
 */

import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { executeBuy, executeSell } from '../services/transactionService.js';

// ─── Helper privado ────────────────────────────────────────────────────────────

/**
 * Extrae y valida el ID del usuario autenticado desde el request.
 * Lanza AppError 401 si el token no contiene el ID (no debería ocurrir
 * con el middleware `protect` correctamente configurado, pero es una
 * salvaguarda de seguridad adicional).
 *
 * @param req - Request autenticado
 * @returns ID del usuario como string
 * @throws {AppError} 401 si el ID no está presente
 */
function requireUserId(req: AuthRequest): string {
    const id = req.user?.id;
    if (!id) throw new AppError('No autorizado — sesión inválida', 401);
    return id;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/users/profile
 * Devuelve el perfil del usuario autenticado (sin password ni PIN).
 */
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId).select('-password -securityPin');
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/users/validate-pin
 * Valida el PIN de seguridad del usuario.
 * Input pre-validado por Zod.
 */
export const validatePin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { pin } = req.body;
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const isMatch = await user.comparePin(pin);
        if (!isMatch) {
            logger.audit('PIN_VALIDATION_FAILED', userId, {});
            res.status(400).json({ message: 'PIN incorrecto' });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/users/password
 * Cambia la contraseña del usuario. Requiere PIN de confirmación.
 * Input pre-validado por Zod (updatePasswordSchema).
 */
export const updatePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { pin, newPassword } = req.body;
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const isPinMatch = await user.comparePin(pin);
        if (!isPinMatch) {
            res.status(400).json({ message: 'PIN incorrecto' });
            return;
        }

        user.password = newPassword;
        await user.save();

        logger.audit('PASSWORD_CHANGED', userId, { email: user.email });

        res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/users/profile
 * Actualiza campos del perfil del usuario. Requiere PIN de confirmación.
 * Input pre-validado por Zod (updateProfileSchema).
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { pin, fullName, age, country, phoneNumber, birthDate } = req.body;
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const isPinMatch = await user.comparePin(pin);
        if (!isPinMatch) {
            res.status(400).json({ message: 'PIN incorrecto' });
            return;
        }

        if (fullName)    user.fullName    = fullName;
        if (country)     user.country     = country;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (birthDate)   user.birthDate   = birthDate;

        if (age !== undefined) {
            if (age < 18) {
                res.status(400).json({ message: 'Debes tener al menos 18 años' });
                return;
            }
            user.age = age;
        }

        await user.save();

        logger.audit('PROFILE_UPDATED', userId, { email: user.email });

        // Nunca devolver password ni securityPin en la respuesta
        const safeUser = await User.findById(userId).select('-password -securityPin');
        res.json(safeUser);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/users/favorites
 * Alterna (agrega o elimina) una criptomoneda de los favoritos del usuario.
 * Input pre-validado por Zod (toggleFavoriteSchema).
 */
export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { cryptoId } = req.body;
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const index = user.favorites.indexOf(cryptoId);
        if (index > -1) {
            user.favorites.splice(index, 1);
        } else {
            user.favorites.push(cryptoId);
        }

        await user.save();
        res.json({ favorites: user.favorites });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/users/buy
 * Compra una criptomoneda con USD virtual.
 *
 * ⚠️  La lógica financiera ACID se delega completamente a `transactionService.executeBuy`.
 *     El precio se obtiene SIEMPRE del caché del servidor — nunca de req.body.price.
 *
 * Input pre-validado por Zod (buySchema).
 */
export const buyCrypto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { coinId, symbol, name, amount } = req.body;
    try {
        const userId = requireUserId(req);
        const io     = req.app.get('io');

        const { user } = await executeBuy({ userId, coinId, symbol, name, amount, io });
        res.json(user);

    } catch (error: unknown) {
        logger.error('userController.buyCrypto: error', {
            error:  error instanceof Error ? error.message : String(error),
            coinId,
            userId: req.user?.id,
        });
        next(error);
    }
};

/**
 * POST /api/users/sell
 * Vende una criptomoneda a cambio de USD virtual.
 *
 * ⚠️  La lógica financiera ACID se delega completamente a `transactionService.executeSell`.
 *     El precio se obtiene SIEMPRE del caché del servidor — nunca de req.body.price.
 *
 * Input pre-validado por Zod (sellSchema).
 */
export const sellCrypto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { coinId, symbol, name, amount } = req.body;
    try {
        const userId = requireUserId(req);
        const io     = req.app.get('io');

        const { user } = await executeSell({ userId, coinId, symbol, name, amount, io });
        res.json(user);

    } catch (error: unknown) {
        logger.error('userController.sellCrypto: error', {
            error:  error instanceof Error ? error.message : String(error),
            coinId,
            userId: req.user?.id,
        });
        next(error);
    }
};

/**
 * POST /api/users/alerts
 * Agrega una nueva alerta de precio para el usuario.
 * Input pre-validado por Zod.
 */
export const addAlert = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { coinId, symbol, condition, targetPrice } = req.body;
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        user.alerts.push({
            id:          new Types.ObjectId().toString(),
            coinId,
            symbol,
            condition,
            targetPrice,
            active:      true,
        });

        await user.save();
        res.json(user.alerts);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/users/alerts/:id
 * Elimina una alerta de precio por su ID.
 */
export const removeAlert = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    try {
        const userId = requireUserId(req);
        const user   = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        user.alerts = user.alerts.filter(a => a.id !== id);
        await user.save();
        res.json(user.alerts);
    } catch (error) {
        next(error);
    }
};

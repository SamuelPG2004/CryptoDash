import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendEmail, escapeHtml } from '../services/emailService.js';

/** Extrae un mensaje legible de un error desconocido sin recurrir a `any` */
const errMsg = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * POST /api/auth/register
 * Creates a new user account. Input is pre-validated by Zod middleware.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, fullName, age, country, phoneNumber, birthDate, securityPin } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      // 409 Conflict: el recurso ya existe — semánticamente correcto vs. 400
      return res.status(409).json({ message: 'El usuario ya existe' });
    }

    const user = await User.create({
      email, password, fullName, age, country, phoneNumber, birthDate, securityPin,
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    logger.audit('USER_REGISTER', user._id.toString(), { email: user.email, country });

    // Envío fire-and-forget del correo de bienvenida. No se espera la respuesta
    // para no retrasar la respuesta HTTP al cliente; emailService aísla los fallos.
    void sendEmail({
      to: user.email,
      subject: 'Bienvenido a CryptoDash',
      html: `<p>Hola <strong>${escapeHtml(user.fullName)}</strong>,</p>
             <p>Gracias por registrarte en <strong>CryptoDash</strong>. Tu cuenta está lista para empezar a gestionar activos digitales.</p>
             <p>Saludos,<br>El equipo de CryptoDash</p>`,
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      age: user.age,
      country: user.country,
      phoneNumber: user.phoneNumber,
      birthDate: user.birthDate,
      createdAt: user.createdAt,
      token,
      favorites: user.favorites,
      wallet: user.wallet,
    });
  } catch (error) {
    logger.error('Register error', { error: errMsg(error) });
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT. Input is pre-validated by Zod middleware.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // 401 y mensaje idéntico al de contraseña incorrecta — evita enumeración de cuentas
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.audit('LOGIN_FAILED', 'unknown', { email, reason: 'bad_password' });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    logger.audit('USER_LOGIN', user._id.toString(), { email: user.email });

    res.json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      age: user.age,
      country: user.country,
      phoneNumber: user.phoneNumber,
      birthDate: user.birthDate,
      createdAt: user.createdAt,
      token,
      favorites: user.favorites,
      wallet: user.wallet,
    });
  } catch (error) {
    logger.error('Login error', { error: errMsg(error) });
    next(error);
  }
};

/** Duración de validez del token de recuperación de contraseña: 1 hora */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1_000;

/** Hashea el token de recuperación — en BD solo se guarda el hash, nunca el token en claro */
const hashResetToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * POST /api/auth/forgot-password
 * Genera un token de recuperación de un solo uso y lo envía por correo.
 * Responde SIEMPRE con el mismo mensaje genérico, exista o no la cuenta,
 * para no permitir enumeración de usuarios registrados.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const genericResponse = {
    message: 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.',
  };

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashResetToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Restablece tu contraseña — CryptoDash',
      html: `<p>Hola <strong>${escapeHtml(user.fullName)}</strong>,</p>
             <p>Recibimos una solicitud para restablecer tu contraseña en <strong>CryptoDash</strong>.</p>
             <p><a href="${resetUrl}">Haz clic aquí para crear una nueva contraseña</a></p>
             <p>El enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual sigue siendo válida.</p>
             <p>Saludos,<br>El equipo de CryptoDash</p>`,
    });

    logger.audit('PASSWORD_RESET_REQUESTED', user._id.toString(), { email: user.email });
    res.json(genericResponse);
  } catch (error) {
    logger.error('Forgot password error', { error: errMsg(error) });
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Valida el token de recuperación y establece la nueva contraseña.
 * El token es de un solo uso: se borra de la BD al completar el cambio.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'El enlace es inválido o ha expirado. Solicita uno nuevo.' });
    }

    user.password = password;  // el hook pre-save la hashea con bcrypt
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.audit('PASSWORD_RESET_COMPLETED', user._id.toString(), { email: user.email });
    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    logger.error('Reset password error', { error: errMsg(error) });
    next(error);
  }
};

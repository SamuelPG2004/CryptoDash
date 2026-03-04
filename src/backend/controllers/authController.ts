import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * POST /api/auth/register
 * Creates a new user account. Input is pre-validated by Zod middleware.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, fullName, age, country, phoneNumber, birthDate, securityPin } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const user = await User.create({
      email, password, fullName, age, country, phoneNumber, birthDate, securityPin,
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    logger.audit('USER_REGISTER', user._id.toString(), { email: user.email, country });

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
  } catch (error: any) {
    logger.error('Register error', { error: error.message });
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
    const user: any = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.audit('LOGIN_FAILED', 'unknown', { email, reason: 'bad_password' });
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: '30d' },
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
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    next(error);
  }
};

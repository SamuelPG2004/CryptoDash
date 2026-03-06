import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile (excluding password and PIN).
 */
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id).select('-password -securityPin');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/validate-pin
 * Validates the user's security PIN. Input pre-validated by Zod.
 */
export const validatePin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { pin } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      logger.audit('PIN_VALIDATION_FAILED', req.user?.id || 'unknown', {});
      return res.status(400).json({ message: 'PIN incorrecto' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/password
 * Changes the user's password. Requires security PIN confirmation.
 * Input pre-validated by Zod (updatePasswordSchema).
 */
export const updatePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { pin, newPassword } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isPinMatch = await user.comparePin(pin);
    if (!isPinMatch) {
      return res.status(400).json({ message: 'PIN incorrecto' });
    }

    user.password = newPassword;
    await user.save();

    logger.audit('PASSWORD_CHANGED', req.user?.id || 'unknown', { email: user.email });

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/profile
 * Updates user profile fields. Requires security PIN confirmation.
 * Input pre-validated by Zod (updateProfileSchema).
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { pin, fullName, age, country, phoneNumber, birthDate } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isPinMatch = await user.comparePin(pin);
    if (!isPinMatch) {
      return res.status(400).json({ message: 'PIN incorrecto' });
    }

    if (fullName) user.fullName = fullName;
    if (age) {
      if (age < 18) return res.status(400).json({ message: 'Debes tener al menos 18 años' });
      user.age = age;
    }
    if (country) user.country = country;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (birthDate) user.birthDate = birthDate;

    await user.save();

    logger.audit('PROFILE_UPDATED', req.user?.id || 'unknown', { email: user.email });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/favorites
 * Toggles a cryptocurrency in the user's favorites list.
 * Input pre-validated by Zod (toggleFavoriteSchema).
 */
export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { cryptoId } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

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
 * Buys cryptocurrency with virtual USD. Validates sufficient balance.
 * Input pre-validated by Zod (buySchema).
 */
export const buyCrypto = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { coinId, symbol, amount, price } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const totalCost = amount * price;
    if (user.wallet < totalCost) {
      return res.status(400).json({ message: 'Saldo insuficiente en tu wallet' });
    }

    // Update wallet
    user.wallet -= totalCost;

    // Update portfolio
    const itemIndex = user.portfolio.findIndex(p => p.coinId === coinId);
    if (itemIndex > -1) {
      const currentItem = user.portfolio[itemIndex];
      const newAmount = currentItem.amount + amount;
      const newAveragePrice = ((currentItem.amount * currentItem.averagePrice) + totalCost) / newAmount;

      user.portfolio[itemIndex].amount = newAmount;
      user.portfolio[itemIndex].averagePrice = newAveragePrice;
    } else {
      user.portfolio.push({ coinId, symbol, amount, averagePrice: price });
    }

    await user.save();

    logger.audit('CRYPTO_BUY', req.user?.id || 'unknown', {
      coinId, symbol, amount, price, totalCost,
      newWalletBalance: user.wallet,
    });

    res.json(user);
  } catch (error) {
    logger.error('Error buying crypto', { error: (error as any).message, coinId });
    next(error);
  }
};

/**
 * POST /api/users/sell
 * Sells cryptocurrency for virtual USD. Validates sufficient holdings.
 * Input pre-validated by Zod (sellSchema).
 */
export const sellCrypto = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { coinId, amount, price } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const itemIndex = user.portfolio.findIndex(p => p.coinId === coinId);
    if (itemIndex === -1 || user.portfolio[itemIndex].amount < amount) {
      return res.status(400).json({ message: 'No tienes suficientes activos para vender' });
    }

    // Update wallet
    const totalEarnings = amount * price;
    user.wallet += totalEarnings;

    // Update portfolio
    user.portfolio[itemIndex].amount -= amount;

    // Remove if zero
    if (user.portfolio[itemIndex].amount === 0) {
      user.portfolio.splice(itemIndex, 1);
    }

    await user.save();

    logger.audit('CRYPTO_SELL', req.user?.id || 'unknown', {
      coinId, amount, price, totalEarnings,
      newWalletBalance: user.wallet,
    });

    res.json(user);
  } catch (error) {
    logger.error('Error selling crypto', { error: (error as any).message, coinId });
    next(error);
  }
};

/**
 * POST /api/users/alerts
 * Adds a new price alert
 */
export const addAlert = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { coinId, symbol, condition, targetPrice } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.alerts.push({
      id: Math.random().toString(36).substring(7),
      coinId,
      symbol,
      condition,
      targetPrice,
      active: true
    });

    await user.save();
    res.json(user.alerts);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/alerts/:id
 * Removes a price alert
 */
export const removeAlert = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.alerts = user.alerts.filter(a => a.id !== id);
    await user.save();
    res.json(user.alerts);
  } catch (error) {
    next(error);
  }
};

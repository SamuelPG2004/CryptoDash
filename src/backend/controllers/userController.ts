import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password -securityPin');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const validatePin = async (req: AuthRequest, res: Response) => {
  const { pin } = req.body;
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'PIN incorrecto' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
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

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
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
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
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
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const buyCrypto = async (req: AuthRequest, res: Response) => {
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
      user.portfolio.push({
        coinId,
        symbol,
        amount,
        averagePrice: price
      });
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error buying crypto:', error);
    res.status(500).json({ message: 'Error al procesar la compra' });
  }
};

export const sellCrypto = async (req: AuthRequest, res: Response) => {
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
    res.json(user);
  } catch (error) {
    console.error('Error selling crypto:', error);
    res.status(500).json({ message: 'Error al procesar la venta' });
  }
};

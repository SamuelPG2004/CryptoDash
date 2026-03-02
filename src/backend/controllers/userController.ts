import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.ts';
import User from '../models/User.ts';

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

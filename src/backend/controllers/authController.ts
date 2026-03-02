import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
  const { 
    email, 
    password, 
    fullName, 
    age, 
    country, 
    phoneNumber, 
    birthDate, 
    securityPin 
  } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    if (age < 18) {
      return res.status(400).json({ message: 'Registro denegado: Solo mayores de 18 años.' });
    }

    const user = await User.create({ 
      email, 
      password, 
      fullName, 
      age, 
      country, 
      phoneNumber, 
      birthDate, 
      securityPin 
    });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

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
      wallet: user.wallet
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user: any = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

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
      wallet: user.wallet
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

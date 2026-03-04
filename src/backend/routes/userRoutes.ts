import express from 'express';
import {
  getProfile,
  toggleFavorite,
  validatePin,
  updatePassword,
  updateProfile,
  buyCrypto,
  sellCrypto
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.post('/favorites', protect, toggleFavorite);
router.post('/validate-pin', protect, validatePin);
router.put('/password', protect, updatePassword);
router.put('/profile', protect, updateProfile);
router.post('/buy', protect, buyCrypto);
router.post('/sell', protect, sellCrypto);

export default router;

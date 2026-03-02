import express from 'express';
import { 
  getProfile, 
  toggleFavorite, 
  validatePin, 
  updatePassword, 
  updateProfile 
} from '../controllers/userController.ts';
import { protect } from '../middleware/auth.ts';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.post('/favorites', protect, toggleFavorite);
router.post('/validate-pin', protect, validatePin);
router.put('/password', protect, updatePassword);
router.put('/profile', protect, updateProfile);

export default router;

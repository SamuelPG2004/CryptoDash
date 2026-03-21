import express from 'express';
import { getTransactions } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/', protect, asyncHandler(getTransactions));

export default router;

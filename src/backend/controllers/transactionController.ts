import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';

/**
 * GET /api/transactions
 * Returns the authenticated user's full trade history, newest first.
 */
export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transactions = await Transaction
      .find({ userId: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(200); // cap at 200 most recent

    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

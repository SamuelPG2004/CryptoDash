import mongoose, { Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'buy' | 'sell';
  coinId: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  totalUSD: number;
  createdAt: Date;
}

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true,
  },
  coinId: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '',
  },
  amount: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  totalUSD: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;

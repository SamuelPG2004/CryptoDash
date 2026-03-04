import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  age: number;
  country: string;
  phoneNumber: string;
  birthDate: Date;
  securityPin: string;
  favorites: string[];
  wallet: number;
  portfolio: {
    coinId: string;
    symbol: string;
    amount: number;
    averagePrice: number;
  }[];
  createdAt: Date;
  comparePassword: (password: string) => Promise<boolean>;
  comparePin: (pin: string) => Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18
  },
  country: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  birthDate: {
    type: Date,
    required: true
  },
  securityPin: {
    type: String,
    required: true
  },
  favorites: {
    type: [String],
    default: []
  },
  wallet: {
    type: Number,
    default: 10000.0
  },
  portfolio: [{
    coinId: { type: String, required: true },
    symbol: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    averagePrice: { type: Number, required: true, default: 0 }
  }]
}, {
  timestamps: true
});

// Hash password and PIN before saving
userSchema.pre<IUser>('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified('securityPin')) {
    this.securityPin = await bcrypt.hash(this.securityPin, 10);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to compare security PIN
userSchema.methods.comparePin = async function (candidatePin: string) {
  return await bcrypt.compare(candidatePin, this.securityPin);
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;

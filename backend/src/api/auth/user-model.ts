import mongoose, { Document, Schema, Types } from 'mongoose';
import { LessonLevel } from '../lessons/contracts';

export interface IUser extends Document {
  _id: Types.ObjectId;
  provider: 'google';
  providerSubject: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
  levelPreference?: LessonLevel;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

const UserSchema = new Schema<IUser>({
  provider: { type: String, required: true, enum: ['google'] },
  providerSubject: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  emailVerified: { type: Boolean, required: true },
  displayName: { type: String, trim: true },
  avatarUrl: { type: String, trim: true },
  levelPreference: { type: String, enum: ['basic', 'intermediate', 'upper_intermediate', 'advanced'] },
  lastLoginAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

UserSchema.index({ provider: 1, providerSubject: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);

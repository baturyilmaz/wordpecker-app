import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuthSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  guestIdAtLogin?: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
}

const AuthSessionSchema = new Schema<IAuthSession>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  tokenHash: { type: String, required: true, unique: true },
  guestIdAtLogin: { type: String, trim: true },
  expiresAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSession = mongoose.model<IAuthSession>('AuthSession', AuthSessionSchema);

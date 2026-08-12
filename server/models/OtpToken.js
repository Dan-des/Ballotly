import mongoose from 'mongoose';

/**
 * OtpToken — Temporary document that holds pending signup data.
 * Auto-deleted by MongoDB TTL index after 10 minutes.
 */
const otpTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  hashedPassword: {
    type: String,
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    index: { expires: 0 }, // MongoDB TTL: auto-delete when expiresAt is reached
  },
});

const OtpToken = mongoose.models.OtpToken || mongoose.model('OtpToken', otpTokenSchema);

export default OtpToken;

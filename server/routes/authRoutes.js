import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import OtpToken from '../models/OtpToken.js';
import { sendWelcomeEmail, sendOtpEmail, sendGoodbyeEmail } from '../services/emailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_voting_jwt_key_2026';

// Helper to generate JWT Token
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware to verify JWT Token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Invalid or expired authentication token.' });
  }
}

/**
 * POST /api/auth/signup
 * Register a new user with credentials & trigger welcome email
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      authProvider: 'credentials',
      role: 'admin',
    });

    const savedUser = await newUser.save();
    const token = generateToken(savedUser);

    // Asynchronously trigger welcome email (non-blocking)
    sendWelcomeEmail({ email: savedUser.email, name: savedUser.name }).catch((err) => {
      console.error('[Welcome Email Background Error]', err.message);
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        authProvider: savedUser.authProvider,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create user account.' });
  }
});

/**
 * POST /api/auth/login
 * Log in with credentials (email & password)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide both email and password.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        error: 'This email is registered via Google OAuth. Please click "Continue with Google".',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
});

/**
 * POST /api/auth/google
 * Google OAuth 2.0 Login / Registration Endpoint
 */
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Google authentication payload missing required fields.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      // Create new Google User
      user = new User({
        name: name.trim(),
        email: trimmedEmail,
        googleId: googleId || `google_${Date.now()}`,
        authProvider: 'google',
        role: 'admin',
      });
      await user.save();

      // Asynchronously trigger welcome email for new Google signup (non-blocking)
      sendWelcomeEmail({ email: user.email, name: user.name }).catch((err) => {
        console.error('[Welcome Email Background Error]', err.message);
      });
    } else if (!user.googleId) {
      // Link Google ID if registered previously
      user.googleId = googleId || `google_${Date.now()}`;
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({ success: false, error: 'Google authentication failed.' });
  }
});

/**
 * GET /api/auth/me
 * Gets authenticated user details
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user details.' });
  }
});

/**
 * DELETE /api/auth/account & DELETE /api/auth/me
 * Protected account deletion route
 */
async function handleDeleteAccount(req, res) {
  try {
    const rawUserId = req.user?.userId || req.user?.id;
    if (!rawUserId) {
      return res.status(401).json({ success: false, error: 'Authentication missing user ID.' });
    }

    const objectId = mongoose.Types.ObjectId.isValid(rawUserId)
      ? new mongoose.Types.ObjectId(rawUserId)
      : rawUserId;

    // Fetch user BEFORE deleting so we have their name & email for the goodbye mail
    const userToDelete = await User.findById(objectId).select('name email');

    const userPolls = await Poll.find({ createdBy: objectId });
    const pollIds = userPolls.map((p) => p._id);

    if (pollIds.length > 0) {
      await Vote.deleteMany({ pollId: { $in: pollIds } });
    }

    await Poll.deleteMany({ createdBy: objectId });
    await User.findByIdAndDelete(objectId);

    // Fire goodbye email asynchronously — non-blocking so deletion response is instant
    if (userToDelete?.email) {
      sendGoodbyeEmail({ email: userToDelete.email, name: userToDelete.name }).catch((err) => {
        console.error('[Goodbye Email Background Error]', err.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account and associated data deleted successfully.',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete user account.' });
  }
}

router.delete('/account', authenticateToken, handleDeleteAccount);
router.delete('/me', authenticateToken, handleDeleteAccount);

/**
 * POST /api/auth/send-otp
 * Step 1 of email signup: validate inputs, hash password, generate OTP, send email
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Check if a verified account already exists for this email
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Hash both OTP and password before storing
    const [otpHash, hashedPassword] = await Promise.all([
      bcrypt.hash(otp, 10),
      bcrypt.hash(password, 10),
    ]);

    // Upsert OtpToken — replaces any existing pending OTP for this email
    await OtpToken.findOneAndUpdate(
      { email: trimmedEmail },
      {
        email: trimmedEmail,
        name: trimmedName,
        hashedPassword,
        otpHash,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Dispatch OTP email (non-blocking — errors are logged but don't fail the request)
    const emailResult = await sendOtpEmail({ email: trimmedEmail, name: trimmedName, otp });
    if (!emailResult.success) {
      console.error('[OTP Route] Email dispatch failed:', emailResult.error);
      return res.status(500).json({ success: false, error: 'Failed to send verification email. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('[Send OTP Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to initiate verification. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2 of email signup: verify OTP and create the user account
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otpToken = await OtpToken.findOne({ email: trimmedEmail });

    if (!otpToken) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired or was never issued. Please request a new one.',
        expired: true,
      });
    }

    const MAX_ATTEMPTS = 3;

    if (otpToken.attempts >= MAX_ATTEMPTS) {
      await OtpToken.deleteOne({ email: trimmedEmail });
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Please start the signup process again.',
        expired: true,
      });
    }

    // Increment attempts before checking — prevents timing-based abuse
    otpToken.attempts += 1;
    await otpToken.save();

    const isMatch = await bcrypt.compare(String(otp).trim(), otpToken.otpHash);

    if (!isMatch) {
      const remaining = MAX_ATTEMPTS - otpToken.attempts;
      return res.status(400).json({
        success: false,
        error: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.',
        remaining,
      });
    }

    // OTP verified — create the account
    const newUser = new User({
      name: otpToken.name,
      email: trimmedEmail,
      password: otpToken.hashedPassword,
      authProvider: 'credentials',
      role: 'admin',
    });

    const savedUser = await newUser.save();

    // Clean up the OTP token immediately
    await OtpToken.deleteOne({ email: trimmedEmail });

    // Issue JWT
    const token = generateToken(savedUser);

    // Dispatch welcome email asynchronously
    sendWelcomeEmail({ email: savedUser.email, name: savedUser.name }).catch((err) => {
      console.error('[Welcome Email Background Error]', err.message);
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        authProvider: savedUser.authProvider,
      },
    });
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    return res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Re-generates and re-sends an OTP for an email that already has a pending OtpToken.
 * Uses the already-hashed password stored in OtpToken — no password input needed.
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existingToken = await OtpToken.findOne({ email: trimmedEmail });

    if (!existingToken) {
      return res.status(400).json({
        success: false,
        error: 'No pending verification found for this email. Please restart the signup process.',
        expired: true,
      });
    }

    // Generate a fresh 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    // Reset OTP hash, attempts, and extend expiry
    existingToken.otpHash = otpHash;
    existingToken.attempts = 0;
    existingToken.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await existingToken.save();

    const emailResult = await sendOtpEmail({ email: trimmedEmail, name: existingToken.name, otp });
    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to resend verification email. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'A new verification code has been sent.' });
  } catch (error) {
    console.error('[Resend OTP Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to resend code. Please try again.' });
  }
});

/**
 * POST /api/auth/reset-database
 * Clear all database collections (Users, Polls, Votes) for a clean slate
 */
router.post('/reset-database', async (req, res) => {
  try {
    await User.deleteMany({});
    await Poll.deleteMany({});
    await Vote.deleteMany({});
    await OtpToken.deleteMany({});

    console.log('🧹 [Database Reset] All users, polls, votes, and pending OTPs deleted cleanly.');

    return res.status(200).json({
      success: true,
      message: 'Database has been reset cleanly. All user accounts, polls, and votes cleared.',
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset database.' });
  }
});

export default router;

import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Poll title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  options: {
    type: [String],
    default: [],
  },
  /**
   * Optional Multi-Position Categories (e.g. President, Vice President, Secretary)
   */
  categories: [
    {
      title: { type: String, required: true, trim: true },
      options: { type: [String], required: true },
    },
  ],
  /**
   * trackingMethod controls which voter identity field(s) are required
   * and used to prevent duplicate votes.
   *
   * Supported values:
   *   'email'          — Email address only
   *   'phone'          — Phone number only
   *   'email_phone'    — Email address + phone number (both required)
   *   'student_id'     — Student / Matriculation ID only
   *   'email_studentid'— Email address + Student ID (both required)
   *   'voter_id'       — Custom voter / membership ID only
   */
  trackingMethod: {
    type: String,
    enum: ['email', 'phone', 'email_phone', 'student_id', 'email_studentid', 'voter_id'],
    default: 'email',
  },
  isResultPublic: {
    type: Boolean,
    default: false,
  },
  requireWhitelist: {
    type: Boolean,
    default: false,
  },
  allowedVoters: {
    type: [String],
    default: [],
  },
  startsAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date/time is required'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Poll owner (createdBy) is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast user-specific dashboard poll lookups sorted by creation date
pollSchema.index({ createdBy: 1, createdAt: -1 });

const Poll = mongoose.models.Poll || mongoose.model('Poll', pollSchema);

export default Poll;

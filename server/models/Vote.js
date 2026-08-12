import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: [true, 'Poll ID is required'],
  },
  // Email address — used by: email, email_phone, email_studentid
  voterEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  // Phone number — used by: phone, email_phone
  voterPhone: {
    type: String,
    trim: true,
    default: null,
  },
  // Student / Matriculation ID — used by: student_id, email_studentid
  studentId: {
    type: String,
    trim: true,
    uppercase: true,
    default: null,
  },
  // Custom voter / membership ID — used by: voter_id
  voterId: {
    type: String,
    trim: true,
    default: null,
  },
  selectedOption: {
    type: String,
    trim: true,
    default: '',
  },
  /**
   * Selections for multi-position category polls
   * [{ categoryTitle: "President", selectedOption: "Alice" }]
   */
  categorySelections: [
    {
      categoryTitle: { type: String, trim: true },
      selectedOption: { type: String, trim: true },
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes to speed up duplicate-vote lookups per poll
voteSchema.index({ pollId: 1, voterEmail: 1 });
voteSchema.index({ pollId: 1, voterPhone: 1 });
voteSchema.index({ pollId: 1, studentId: 1 });
voteSchema.index({ pollId: 1, voterId: 1 });

const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);

export default Vote;

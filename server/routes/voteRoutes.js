import express from 'express';
import axios from 'axios';
import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import { authenticateToken } from './authRoutes.js';

const router = express.Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;

// Asynchronous non-blocking n8n webhook dispatch
async function triggerN8nWebhook(votePayload) {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nWebhookUrl) return;
  try {
    await axios.post(n8nWebhookUrl, votePayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    console.log(`[n8n Webhook] Dispatched vote for poll "${votePayload.pollTitle}"`);
  } catch (error) {
    console.error(`[n8n Webhook Warning] ${error.message}`);
  }
}

/**
 * POST /api/vote
 * Submit a vote. Validates & deduplicates dynamically based on poll's trackingMethod.
 */
router.post('/vote', async (req, res) => {
  try {
    const { pollId, selectedOption, voterEmail, email, voterPhone, phone, studentId, student_id, voterId, voter_id } = req.body;

    if (!pollId) return res.status(400).json({ success: false, error: 'Poll ID is required.' });

    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found.' });

    if (poll.startsAt && new Date(poll.startsAt) > new Date()) {
      return res.status(400).json({
        success: false,
        error: `Voting has not started yet. This election is scheduled to open on ${new Date(poll.startsAt).toLocaleString()}.`,
      });
    }

    if (new Date(poll.expiresAt) <= new Date()) {
      return res.status(400).json({ success: false, error: 'This poll has closed. Voting is no longer accepted.' });
    }

    const isCategoryPoll = Array.isArray(poll.categories) && poll.categories.length > 0;
    let cleanedCategorySelections = [];
    let primarySelectedOption = '';

    if (isCategoryPoll) {
      const { categorySelections } = req.body;
      if (!Array.isArray(categorySelections) || categorySelections.length < poll.categories.length) {
        return res.status(400).json({ success: false, error: 'Please select a candidate for all positions.' });
      }

      for (const cat of poll.categories) {
        const sel = categorySelections.find((s) => s.categoryTitle === cat.title || s.title === cat.title);
        if (!sel || !sel.selectedOption || !cat.options.includes(sel.selectedOption)) {
          return res.status(400).json({
            success: false,
            error: `Please select a valid candidate for position "${cat.title}".`,
          });
        }
        cleanedCategorySelections.push({
          categoryTitle: cat.title,
          selectedOption: sel.selectedOption.trim(),
        });
      }
      primarySelectedOption = cleanedCategorySelections.map((c) => `${c.categoryTitle}: ${c.selectedOption}`).join(' | ');
    } else {
      if (!selectedOption || !poll.options.includes(selectedOption)) {
        return res.status(400).json({
          success: false,
          error: `Invalid choice. Option must be one of: ${poll.options.join(', ')}`,
        });
      }
      primarySelectedOption = selectedOption.trim();
    }

    // Dynamic field detection & normalization
    const m = String(poll.trackingMethod || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const needsEmail = m.includes('email') || m === 'both';
    const needsPhone = m.includes('phone');
    const needsStudentId = m.includes('student') || m.includes('studentid') || m === 'both';
    const needsVoterId = m.includes('voter');

    const emailToVerify = voterEmail || email;
    const phoneToVerify = voterPhone || phone;
    const studentIdToVerify = studentId || student_id;
    const voterIdToVerify = voterId || voter_id;

    let cleanEmail = emailToVerify && typeof emailToVerify === 'string' ? emailToVerify.trim().toLowerCase() : null;
    let cleanPhone = phoneToVerify && typeof phoneToVerify === 'string' ? phoneToVerify.trim() : null;
    let cleanStudentId = studentIdToVerify && typeof studentIdToVerify === 'string' ? studentIdToVerify.trim().toUpperCase() : null;
    let cleanVoterId = voterIdToVerify && typeof voterIdToVerify === 'string' ? voterIdToVerify.trim() : null;

    // ── Whitelist Verification (If required by poll) ─────────────────
    if (poll.requireWhitelist && Array.isArray(poll.allowedVoters) && poll.allowedVoters.length > 0) {
      const allowedSet = new Set(poll.allowedVoters.map((v) => String(v).trim().toLowerCase()));
      
      const submittedIdentifiers = [
        cleanEmail,
        cleanPhone ? cleanPhone.toLowerCase() : null,
        cleanStudentId ? cleanStudentId.toLowerCase() : null,
        cleanVoterId ? cleanVoterId.toLowerCase() : null,
      ].filter(Boolean);

      const isAuthorized = submittedIdentifiers.some((id) => allowedSet.has(id));

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Your email or ID is not on the authorized voter whitelist for this election. Please contact the administrator.',
        });
      }
    }

    // ── Email verification ──────────────────────────────────────────
    if (needsEmail) {
      if (!emailToVerify || typeof emailToVerify !== 'string' || !emailToVerify.trim()) {
        return res.status(400).json({ success: false, error: 'Email address is required for this poll.' });
      }
      cleanEmail = emailToVerify.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }
      const dup = await Vote.findOne({ pollId, voterEmail: cleanEmail });
      if (dup) {
        return res.status(400).json({ success: false, error: 'This email address has already been used to vote in this poll.' });
      }
    }

    // ── Phone verification ──────────────────────────────────────────
    if (needsPhone) {
      if (!phoneToVerify || typeof phoneToVerify !== 'string' || !phoneToVerify.trim()) {
        return res.status(400).json({ success: false, error: 'Phone number is required for this poll.' });
      }
      cleanPhone = phoneToVerify.trim();
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid phone number.' });
      }
      const dup = await Vote.findOne({ pollId, voterPhone: cleanPhone });
      if (dup) {
        return res.status(400).json({ success: false, error: 'This phone number has already been used to vote in this poll.' });
      }
    }

    // ── Student ID verification ─────────────────────────────────────
    if (needsStudentId) {
      if (!studentIdToVerify || typeof studentIdToVerify !== 'string' || !studentIdToVerify.trim()) {
        return res.status(400).json({ success: false, error: 'Student / Matriculation ID is required for this poll.' });
      }
      cleanStudentId = studentIdToVerify.trim().toUpperCase();
      const dup = await Vote.findOne({ pollId, studentId: cleanStudentId });
      if (dup) {
        return res.status(400).json({ success: false, error: 'This Student ID has already been used to vote in this poll.' });
      }
    }

    // ── Voter ID verification ───────────────────────────────────────
    if (needsVoterId) {
      if (!voterIdToVerify || typeof voterIdToVerify !== 'string' || !voterIdToVerify.trim()) {
        return res.status(400).json({ success: false, error: 'Voter / Membership ID is required for this poll.' });
      }
      cleanVoterId = voterIdToVerify.trim();
      const dup = await Vote.findOne({ pollId, voterId: cleanVoterId });
      if (dup) {
        return res.status(400).json({ success: false, error: 'This Voter ID has already been used to vote in this poll.' });
      }
    }

    // ── Persist vote ─────────────────────────────────────────────────────────
    const newVote = new Vote({
      pollId: poll._id,
      voterEmail: cleanEmail,
      voterPhone: cleanPhone,
      studentId: cleanStudentId,
      voterId: cleanVoterId,
      selectedOption: primarySelectedOption,
      categorySelections: cleanedCategorySelections,
      timestamp: new Date(),
    });

    const savedVote = await newVote.save();

    // Async webhook — non-blocking
    triggerN8nWebhook({
      voteId: savedVote._id,
      pollId: poll._id,
      pollTitle: poll.title,
      voterEmail: savedVote.voterEmail,
      voterPhone: savedVote.voterPhone,
      studentId: savedVote.studentId,
      voterId: savedVote.voterId,
      selectedOption: savedVote.selectedOption,
      timestamp: savedVote.timestamp,
    });

    return res.status(201).json({
      success: true,
      message: 'Vote submitted successfully!',
      data: {
        id: savedVote._id,
        pollId: savedVote.pollId,
        voterEmail: savedVote.voterEmail,
        voterPhone: savedVote.voterPhone,
        studentId: savedVote.studentId,
        voterId: savedVote.voterId,
        selectedOption: savedVote.selectedOption,
        timestamp: savedVote.timestamp,
      },
    });
  } catch (error) {
    console.error('Vote submission error:', error);
    return res.status(500).json({ success: false, error: 'An error occurred while processing your vote.' });
  }
});

/**
 * GET /api/polls/:pollId/stats
 * Public vote statistics. Respects isResultPublic.
 */
router.get('/polls/:pollId/stats', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found.' });

    const isExpired = new Date(poll.expiresAt) <= new Date();
    const totalVotes = await Vote.countDocuments({ pollId: poll._id });

    const optionBreakdown = await Promise.all(
      poll.options.map(async (option) => {
        const count = await Vote.countDocuments({ pollId: poll._id, selectedOption: option });
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return { option, count, percentage };
      })
    );

    const authHeader = req.headers['authorization'];
    const isAdminRequest = authHeader && authHeader.startsWith('Bearer ');

    // Private & active & non-admin → lock the results
    if (!poll.isResultPublic && !isExpired && !isAdminRequest) {
      return res.status(200).json({
        success: true,
        locked: true,
        isResultPublic: false,
        isExpired: false,
        pollTitle: poll.title,
        message: 'The organizer has set live results to private for this poll. Results will only become visible once enabled by the organizer or after the election closes.',
      });
    }

    return res.status(200).json({
      success: true,
      locked: false,
      stats: {
        pollId: poll._id,
        pollTitle: poll.title,
        totalVotes,
        isResultPublic: poll.isResultPublic,
        isExpired,
        trackingMethod: poll.trackingMethod,
        requireWhitelist: Boolean(poll.requireWhitelist),
        options: optionBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve poll statistics.' });
  }
});

/**
 * GET /api/polls/:pollId/admin-results
 * Protected: Admin-only full audit log with all voter identity fields
 */
router.get('/polls/:pollId/admin-results', authenticateToken, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found.' });

    const votes = await Vote.find({ pollId: poll._id }).sort({ timestamp: -1 });
    const totalVotes = votes.length;

    const optionBreakdown = poll.options.map((option) => {
      const count = votes.filter((v) => v.selectedOption === option).length;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return { option, count, percentage };
    });

    return res.status(200).json({
      success: true,
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        isResultPublic: poll.isResultPublic,
        expiresAt: poll.expiresAt,
        trackingMethod: poll.trackingMethod,
      },
      stats: { totalVotes, options: optionBreakdown },
      responses: votes.map((v) => ({
        id: v._id,
        voterEmail: v.voterEmail,
        voterPhone: v.voterPhone,
        studentId: v.studentId,
        voterId: v.voterId,
        selectedOption: v.selectedOption,
        timestamp: v.timestamp,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch detailed results.' });
  }
});

export default router;

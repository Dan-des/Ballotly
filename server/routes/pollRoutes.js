import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import { authenticateToken } from './authRoutes.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_voting_jwt_key_2026';

/**
 * GET /api/polls
 * Fetch list of polls scoped strictly to the authenticated user's ObjectId
 * Expired polls are NOT filtered out by default and remain visible in history.
 */
router.get('/polls', authenticateToken, async (req, res) => {
  try {
    const rawId = req.user?._id || req.user?.userId || req.user?.id;
    if (!rawId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User ID not found in token.' });
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(rawId)
      ? new mongoose.Types.ObjectId(rawId)
      : rawId;

    let query = { createdBy: userObjectId };

    // Only filter by status if explicitly requested by query parameter
    if (req.query.status === 'active') {
      query.expiresAt = { $gt: new Date() };
    } else if (req.query.status === 'closed' || req.query.status === 'expired') {
      query.expiresAt = { $lte: new Date() };
    }

    const polls = await Poll.find(query).sort({ createdAt: -1 });

    const pollsWithCounts = await Promise.all(
      polls.map(async (poll) => {
        const voteCount = await Vote.countDocuments({ pollId: poll._id });
        const now = new Date();
        const isExpired = new Date(poll.expiresAt) <= now;

        return {
          id: poll._id,
          title: poll.title,
          description: poll.description,
          options: poll.options,
          trackingMethod: poll.trackingMethod,
          isResultPublic: poll.isResultPublic,
          requireWhitelist: Boolean(poll.requireWhitelist),
          allowedVoters: poll.allowedVoters || [],
          categories: poll.categories || [],
          startsAt: poll.startsAt,
          expiresAt: poll.expiresAt,
          isExpired,
          voteCount,
          createdBy: poll.createdBy,
          createdAt: poll.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      polls: pollsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve polls.' });
  }
});

/**
 * GET /api/polls/:id
 * Get single poll details (used by public voting page & live results)
 */
router.get('/polls/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found.' });
    }

    const voteCount = await Vote.countDocuments({ pollId: poll._id });
    const now = new Date();
    const isExpired = new Date(poll.expiresAt) <= now;

    return res.status(200).json({
      success: true,
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        options: poll.options,
        trackingMethod: poll.trackingMethod,
        isResultPublic: poll.isResultPublic,
        requireWhitelist: Boolean(poll.requireWhitelist),
        allowedVoters: poll.allowedVoters || [],
        categories: poll.categories || [],
        startsAt: poll.startsAt,
        expiresAt: poll.expiresAt,
        isExpired,
        voteCount,
        createdAt: poll.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Invalid poll ID format or server error.' });
  }
});

/**
 * POST /api/polls
 * Create a new poll (Protected: Admin only)
 * Saves createdBy strictly as authenticated user ObjectId
 */
router.post('/polls', authenticateToken, async (req, res) => {
  try {
    const { title, description, options, categories, trackingMethod, isResultPublic, requireWhitelist, allowedVoters, duration, expiresAt: directExpiresAt } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Poll title is required.' });
    }

    let cleanedCategories = [];
    if (Array.isArray(categories) && categories.length > 0) {
      cleanedCategories = categories
        .map((cat) => ({
          title: String(cat.title || '').trim(),
          options: Array.isArray(cat.options)
            ? cat.options.map((o) => String(o).trim()).filter(Boolean)
            : [],
        }))
        .filter((cat) => cat.title && cat.options.length >= 2);
    }

    let cleanedOptions = [];
    if (Array.isArray(options)) {
      cleanedOptions = options.map((opt) => String(opt).trim()).filter(Boolean);
    }

    if (cleanedCategories.length === 0 && cleanedOptions.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 voting options or multi-position categories are required.' });
    }

    let calculatedExpiresAt;
    if (directExpiresAt) {
      calculatedExpiresAt = new Date(directExpiresAt);
    } else {
      const days = parseInt(duration?.days || 0, 10);
      const hours = parseInt(duration?.hours || 0, 10);
      const minutes = parseInt(duration?.minutes || 0, 10);
      const seconds = parseInt(duration?.seconds || 0, 10);

      const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
      const durationMs = totalSeconds !== 0 ? totalSeconds * 1000 : 24 * 60 * 60 * 1000;
      calculatedExpiresAt = new Date(Date.now() + durationMs);
    }

    const validTrackingMethods = ['email', 'phone', 'email_phone', 'student_id', 'email_studentid', 'voter_id'];
    const validTracking = validTrackingMethods.includes(trackingMethod) ? trackingMethod : 'email';

    const rawId = req.user?._id || req.user?.userId || req.user?.id;
    if (!rawId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User ID not found in token.' });
    }
    const createdByObjId = mongoose.Types.ObjectId.isValid(rawId)
      ? new mongoose.Types.ObjectId(rawId)
      : rawId;

    let cleanedAllowedVoters = [];
    if (Array.isArray(allowedVoters)) {
      cleanedAllowedVoters = allowedVoters.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    } else if (typeof allowedVoters === 'string') {
      cleanedAllowedVoters = allowedVoters
        .split(/[\n,]+/)
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
    }

    const newPoll = new Poll({
      title: title.trim(),
      description: description ? description.trim() : '',
      options: cleanedOptions,
      categories: cleanedCategories,
      trackingMethod: validTracking,
      isResultPublic: Boolean(isResultPublic),
      requireWhitelist: Boolean(requireWhitelist),
      allowedVoters: cleanedAllowedVoters,
      expiresAt: calculatedExpiresAt,
      createdBy: createdByObjId,
    });

    const savedPoll = await newPoll.save();
    console.log(`[Poll Created] ID: ${savedPoll._id}, createdBy: ${savedPoll.createdBy}`);

    return res.status(201).json({
      success: true,
      message: 'Poll created successfully.',
      poll: {
        id: savedPoll._id,
        title: savedPoll.title,
        description: savedPoll.description,
        options: savedPoll.options,
        trackingMethod: savedPoll.trackingMethod,
        isResultPublic: savedPoll.isResultPublic,
        requireWhitelist: savedPoll.requireWhitelist,
        allowedVoters: savedPoll.allowedVoters,
        expiresAt: savedPoll.expiresAt,
        createdBy: savedPoll.createdBy,
        createdAt: savedPoll.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    return res.status(500).json({ success: false, error: 'Failed to create poll.' });
  }
});

/**
 * PUT /api/polls/:id
 * Edit active poll details (Protected: Admin)
 */
router.put('/polls/:id', authenticateToken, async (req, res) => {
  try {
    const rawId = req.user?._id || req.user?.userId || req.user?.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(rawId) ? new mongoose.Types.ObjectId(rawId) : rawId;
    const poll = await Poll.findOne({ _id: req.params.id, createdBy: userObjectId });
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found or access denied.' });
    }

    // Dynamic Check: Enable editing ONLY when poll is active
    if (new Date(poll.expiresAt) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Expired polls cannot be edited.' });
    }

    const { title, description, options, categories, trackingMethod, expiresAt, isResultPublic, requireWhitelist, allowedVoters } = req.body;

    if (title && typeof title === 'string' && title.trim()) {
      poll.title = title.trim();
    }
    if (description !== undefined) {
      poll.description = typeof description === 'string' ? description.trim() : '';
    }
    if (Array.isArray(options)) {
      poll.options = options.map((opt) => String(opt).trim()).filter(Boolean);
    }
    if (Array.isArray(categories)) {
      poll.categories = categories
        .map((cat) => ({
          title: String(cat.title || '').trim(),
          options: Array.isArray(cat.options)
            ? cat.options.map((o) => String(o).trim()).filter(Boolean)
            : [],
        }))
        .filter((cat) => cat.title && cat.options.length >= 2);
    }
    if (trackingMethod) {
      const validTrackingMethods = ['email', 'phone', 'email_phone', 'student_id', 'email_studentid', 'voter_id'];
      if (validTrackingMethods.includes(trackingMethod)) {
        poll.trackingMethod = trackingMethod;
      }
    }
    if (expiresAt) {
      const parsedDate = new Date(expiresAt);
      if (!isNaN(parsedDate.getTime())) {
        poll.expiresAt = parsedDate;
      }
    }
    if (isResultPublic !== undefined) {
      poll.isResultPublic = Boolean(isResultPublic);
    }
    if (requireWhitelist !== undefined) {
      poll.requireWhitelist = Boolean(requireWhitelist);
    }
    if (allowedVoters !== undefined) {
      if (Array.isArray(allowedVoters)) {
        poll.allowedVoters = allowedVoters.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
      } else if (typeof allowedVoters === 'string') {
        poll.allowedVoters = allowedVoters
          .split(/[\n,]+/)
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    const updatedPoll = await poll.save();
    const voteCount = await Vote.countDocuments({ pollId: updatedPoll._id });
    const isExpired = new Date(updatedPoll.expiresAt) <= new Date();

    return res.status(200).json({
      success: true,
      message: 'Poll updated successfully.',
      poll: {
        id: updatedPoll._id,
        title: updatedPoll.title,
        description: updatedPoll.description,
        options: updatedPoll.options,
        trackingMethod: updatedPoll.trackingMethod,
        isResultPublic: updatedPoll.isResultPublic,
        requireWhitelist: updatedPoll.requireWhitelist,
        allowedVoters: updatedPoll.allowedVoters,
        startsAt: updatedPoll.startsAt,
        expiresAt: updatedPoll.expiresAt,
        isExpired,
        voteCount,
        createdBy: updatedPoll.createdBy,
        createdAt: updatedPoll.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating poll:', error);
    return res.status(500).json({ success: false, error: 'Failed to update poll.' });
  }
});

/**
 * PATCH /api/polls/:id/toggle-results
 * Toggle live results visibility switch (Protected: Admin)
 */
router.patch('/polls/:id/toggle-results', authenticateToken, async (req, res) => {
  try {
    const rawId = req.user?._id || req.user?.userId || req.user?.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(rawId) ? new mongoose.Types.ObjectId(rawId) : rawId;
    const poll = await Poll.findOne({ _id: req.params.id, createdBy: userObjectId });
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found or access denied.' });
    }

    poll.isResultPublic = !poll.isResultPublic;
    await poll.save();

    return res.status(200).json({
      success: true,
      message: `Poll result visibility updated to ${poll.isResultPublic ? 'Public' : 'Private'}.`,
      isResultPublic: poll.isResultPublic,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update result visibility.' });
  }
});

/**
 * DELETE /api/polls/:id
 * Delete poll & associated votes (Protected: Admin)
 */
router.delete('/polls/:id', authenticateToken, async (req, res) => {
  try {
    const rawId = req.user?._id || req.user?.userId || req.user?.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(rawId) ? new mongoose.Types.ObjectId(rawId) : rawId;
    const pollId = req.params.id;
    const poll = await Poll.findOne({ _id: pollId, createdBy: userObjectId });
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found or access denied.' });
    }

    await Poll.findByIdAndDelete(pollId);
    await Vote.deleteMany({ pollId });

    return res.status(200).json({ success: true, message: 'Poll and associated votes deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete poll.' });
  }
});

export default router;

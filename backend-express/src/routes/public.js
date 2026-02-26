const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Wish = require('../models/Wish');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

async function findPublicEventBySlug(slug) {
  return Event.findOne({ slug, status: 'published', isActive: true }).lean();
}

router.get('/active-event', async (req, res) => {
  const event = await Event.findOne({ isActive: true, status: 'published' }).lean();
  if (!event) {
    return res.status(404).json({ message: 'No active event found' });
  }
  return res.json(event);
});

router.get('/events/:slug', async (req, res) => {
  const event = await findPublicEventBySlug(req.params.slug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wishes = await Wish.find({ eventId: event._id, isApproved: true })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ event, wishes });
});

router.post('/wishes', async (req, res) => {
  const { eventSlug, authorName, content, userUid, userEmail, avatarUrl } = req.body;
  const normalizedAuthorName = String(authorName || '').trim();
  const normalizedContent = String(content || '').trim();
  const normalizedAvatarUrl = String(avatarUrl || '').trim();
  const normalizedUserUid = String(userUid || '').trim();
  const normalizedUserEmail = String(userEmail || '').trim().toLowerCase();

  if (!eventSlug || !normalizedAuthorName || !normalizedContent) {
    return res.status(400).json({ message: 'eventSlug, authorName, content are required' });
  }

  if (!normalizedUserUid && !normalizedUserEmail) {
    return res.status(401).json({ message: 'Login is required to submit a wish' });
  }

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wish = await Wish.create({
    eventId: event._id,
    userUid: normalizedUserUid || null,
    userEmail: normalizedUserEmail || null,
    avatarUrl: normalizedAvatarUrl || null,
    authorName: normalizedAuthorName,
    content: normalizedContent,
    isApproved: true
  });

  return res.status(201).json(wish);
});

router.get('/chat/:eventSlug/messages', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 40, 1), 100);

  if (!eventSlug) {
    return res.status(400).json({ message: 'eventSlug is required' });
  }

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const messages = await ChatMessage.find({ eventSlug })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.json({ messages: messages.reverse() });
});

router.post('/wishes/:wishId/like', async (req, res) => {
  const { wishId } = req.params;
  const { userUid, userEmail } = req.body;

  if (!mongoose.Types.ObjectId.isValid(wishId)) {
    return res.status(400).json({ message: 'Invalid wish id' });
  }

  const userKey = String(userUid || userEmail || '').trim().toLowerCase();
  if (!userKey) {
    return res.status(400).json({ message: 'Login is required to like a wish' });
  }

  const wish = await Wish.findById(wishId).lean();
  if (!wish) {
    return res.status(404).json({ message: 'Wish not found' });
  }

  const event = await Event.findById(wish.eventId).lean();
  if (!event || event.status !== 'published' || !event.isActive) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const unliked = await Wish.findOneAndUpdate(
    { _id: wishId, likeUserKeys: userKey },
    { $pull: { likeUserKeys: userKey }, $inc: { likesCount: -1 } },
    { new: true }
  ).lean();

  if (unliked) {
    const safeLikesCount = Math.max(0, unliked.likesCount || 0);
    if (safeLikesCount !== (unliked.likesCount || 0)) {
      await Wish.updateOne({ _id: wishId }, { $set: { likesCount: safeLikesCount } });
    }
    return res.json({
      wishId,
      likesCount: safeLikesCount,
      liked: false
    });
  }

  const liked = await Wish.findOneAndUpdate(
    { _id: wishId, likeUserKeys: { $ne: userKey } },
    { $addToSet: { likeUserKeys: userKey }, $inc: { likesCount: 1 } },
    { new: true }
  ).lean();

  return res.json({
    wishId,
    likesCount: liked?.likesCount || 0,
    liked: true
  });
});

module.exports = router;

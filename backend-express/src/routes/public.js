const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Wish = require('../models/Wish');
const ChatMessage = require('../models/ChatMessage');
const GameReward = require('../models/GameReward');
const GameAttempt = require('../models/GameAttempt');

const router = express.Router();

async function findPublicEventBySlug(slug) {
  return Event.findOne({ slug, status: 'published', isActive: true }).lean();
}

function extractUserIdentity(payload = {}) {
  const userUid = String(payload.userUid || '').trim();
  const userEmail = String(payload.userEmail || '')
    .trim()
    .toLowerCase();
  const authorName = String(payload.authorName || '').trim() || 'Guest';
  const userKey = String(userUid || userEmail).trim().toLowerCase();
  return { userUid, userEmail, userKey, authorName };
}

function toEffectiveWeight(item) {
  const quantity = Math.max(0, Number(item.quantity || 0));
  const weight = Math.max(0.01, Number(item.weight || 1));
  return quantity * weight;
}

async function pickReward(eventSlug, gameType) {
  const maxRetry = 6;

  for (let attempt = 0; attempt < maxRetry; attempt += 1) {
    const pool = await GameReward.find({
      eventSlug,
      gameType,
      isActive: true,
      quantity: { $gt: 0 }
    }).lean();

    if (!pool.length) return null;

    const totalWeight = pool.reduce((sum, item) => sum + toEffectiveWeight(item), 0);
    let random = Math.random() * totalWeight;
    let selected = pool[pool.length - 1];

    for (const item of pool) {
      random -= toEffectiveWeight(item);
      if (random <= 0) {
        selected = item;
        break;
      }
    }

    const locked = await GameReward.findOneAndUpdate(
      { _id: selected._id, quantity: { $gt: 0 } },
      { $inc: { quantity: -1 } },
      { new: true }
    ).lean();

    if (locked) return selected;
  }

  return null;
}

async function getWheelPool(eventSlug) {
  return GameReward.find({
    eventSlug,
    gameType: 'wheel',
    isActive: true,
    quantity: { $gt: 0 }
  })
    .sort({ quantity: -1, label: 1 })
    .select({ _id: 0, label: 1, quantity: 1 })
    .lean();
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

router.get('/games/:eventSlug/bootstrap', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  if (!eventSlug) return res.status(400).json({ message: 'eventSlug is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wheelPool = await getWheelPool(eventSlug);
  const remainingCount = wheelPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return res.json({
    eventSlug,
    wheelPool,
    remainingCount
  });
});

router.post('/games/:eventSlug/wheel', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const identity = extractUserIdentity(req.body);
  if (!identity.userKey) return res.status(401).json({ message: 'Login is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) return res.status(403).json({ message: 'This event is not public right now' });

  const reward = await pickReward(eventSlug, 'wheel');
  const rewardLabel = reward?.label || 'Đã hết giải quay thưởng';

  const attempt = await GameAttempt.create({
    eventSlug,
    gameType: 'wheel',
    userUid: identity.userUid || null,
    userEmail: identity.userEmail || null,
    authorName: identity.authorName,
    rewardLabel
  });

  const remainingPool = await getWheelPool(eventSlug);
  const remainingCount = remainingPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return res.json({
    rewardLabel,
    remainingPool,
    remainingCount,
    attemptId: attempt._id
  });
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Wish = require('../models/Wish');
const ChatMessage = require('../models/ChatMessage');
const GameReward = require('../models/GameReward');
const QuizQuestion = require('../models/QuizQuestion');
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

async function pickReward(eventSlug, gameType) {
  const pool = await GameReward.find({
    eventSlug,
    gameType,
    isActive: true
  }).lean();

  if (!pool.length) return null;

  const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  let selected = pool[pool.length - 1];

  for (const item of pool) {
    random -= item.weight || 1;
    if (random <= 0) {
      selected = item;
      break;
    }
  }

  return selected;
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

  const rewards = await GameReward.find({ eventSlug, isActive: true }).lean();
  const quizCount = await QuizQuestion.countDocuments({ eventSlug, isActive: true });

  const grouped = rewards.reduce(
    (acc, item) => {
      if (!acc[item.gameType]) acc[item.gameType] = 0;
      acc[item.gameType] += item.quantity || 0;
      return acc;
    },
    { draw: 0, wheel: 0, flip: 0 }
  );

  return res.json({
    eventSlug,
    pools: grouped,
    quizCount
  });
});

router.post('/games/:eventSlug/draw', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const identity = extractUserIdentity(req.body);
  if (!identity.userKey) return res.status(401).json({ message: 'Login is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) return res.status(403).json({ message: 'This event is not public right now' });

  const reward = await pickReward(eventSlug, 'draw');
  const rewardLabel = reward?.label || 'Hết quà trong kho bốc thăm';

  const attempt = await GameAttempt.create({
    eventSlug,
    gameType: 'draw',
    userUid: identity.userUid || null,
    userEmail: identity.userEmail || null,
    authorName: identity.authorName,
    rewardLabel
  });

  return res.json({
    rewardLabel,
    attemptId: attempt._id
  });
});

router.post('/games/:eventSlug/wheel', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const identity = extractUserIdentity(req.body);
  if (!identity.userKey) return res.status(401).json({ message: 'Login is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) return res.status(403).json({ message: 'This event is not public right now' });

  const reward = await pickReward(eventSlug, 'wheel');
  const rewardLabel = reward?.label || 'Hết quà trong vòng quay';

  const attempt = await GameAttempt.create({
    eventSlug,
    gameType: 'wheel',
    userUid: identity.userUid || null,
    userEmail: identity.userEmail || null,
    authorName: identity.authorName,
    rewardLabel
  });

  return res.json({
    rewardLabel,
    attemptId: attempt._id
  });
});

router.post('/games/:eventSlug/flip', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const selectedCard = Math.max(0, parseInt(req.body.selectedCard, 10) || 0);
  const identity = extractUserIdentity(req.body);
  if (!identity.userKey) return res.status(401).json({ message: 'Login is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) return res.status(403).json({ message: 'This event is not public right now' });

  const reward = await pickReward(eventSlug, 'flip');
  const rewardLabel = reward?.label || 'Ô trống, nhận lời chúc tốt đẹp';

  const attempt = await GameAttempt.create({
    eventSlug,
    gameType: 'flip',
    userUid: identity.userUid || null,
    userEmail: identity.userEmail || null,
    authorName: identity.authorName,
    rewardLabel,
    meta: { selectedCard }
  });

  return res.json({
    rewardLabel,
    selectedCard,
    attemptId: attempt._id
  });
});

router.get('/games/:eventSlug/quiz/question', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const event = await findPublicEventBySlug(eventSlug);
  if (!event) return res.status(403).json({ message: 'This event is not public right now' });

  const questions = await QuizQuestion.find({ eventSlug, isActive: true }).lean();
  if (!questions.length) return res.status(404).json({ message: 'No quiz question available' });

  const random = questions[Math.floor(Math.random() * questions.length)];
  return res.json({
    question: {
      _id: random._id,
      prompt: random.prompt,
      options: random.options,
      rewardAmount: random.rewardAmount
    }
  });
});

router.post('/games/:eventSlug/quiz/answer', async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const questionId = String(req.body.questionId || '').trim();
  const answerIndex = parseInt(req.body.answerIndex, 10);
  const identity = extractUserIdentity(req.body);

  if (!identity.userKey) return res.status(401).json({ message: 'Login is required' });
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    return res.status(400).json({ message: 'Invalid question id' });
  }

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) return res.status(403).json({ message: 'This event is not public right now' });

  const question = await QuizQuestion.findOne({ _id: questionId, eventSlug, isActive: true }).lean();
  if (!question) return res.status(404).json({ message: 'Question not found' });

  const correct = Number.isInteger(answerIndex) && answerIndex === question.correctIndex;
  const rewardAmount = correct ? question.rewardAmount || 0 : 0;
  const rewardLabel = correct ? `Thưởng ${rewardAmount.toLocaleString('vi-VN')}đ` : 'Chưa đúng, thử câu khác nhé';

  const attempt = await GameAttempt.create({
    eventSlug,
    gameType: 'quiz',
    userUid: identity.userUid || null,
    userEmail: identity.userEmail || null,
    authorName: identity.authorName,
    rewardLabel,
    rewardAmount,
    meta: {
      questionId,
      answerIndex,
      correct
    }
  });

  return res.json({
    correct,
    rewardAmount,
    rewardLabel,
    attemptId: attempt._id
  });
});

module.exports = router;

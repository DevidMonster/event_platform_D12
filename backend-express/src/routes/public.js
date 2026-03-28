const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Wish = require('../models/Wish');
const ChatMessage = require('../models/ChatMessage');
const GameReward = require('../models/GameReward');
const GameAttempt = require('../models/GameAttempt');
const GreetingCard = require('../models/GreetingCard');
const { seedMiniGames } = require('../seed');
const { generateCardMessage } = require('../services/ai-card-writer');
const { listGreetingCardTemplates } = require('../services/greeting-card-templates');
const { buildGreetingCardEmail } = require('../services/greeting-card-mail');
const { isMailConfigured, sendMail } = require('../services/mailer');

const router = express.Router();
const MAX_WISH_CONTENT_LENGTH = 10000;

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

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

function normalizeLikeProfiles(list = []) {
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const result = [];
  list.forEach((item) => {
    const userEmail = String(item?.userEmail || '').trim().toLowerCase();
    const userKey = String(item?.userKey || '').trim().toLowerCase();
    const userName = String(item?.userName || '').trim() || 'Guest';
    const dedupeKey = userEmail || userKey;
    if (!dedupeKey || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    result.push({
      userEmail: userEmail || null,
      userName
    });
  });

  return result;
}

function buildLikeProfile({ userKey, userEmail, userName }) {
  const normalizedUserKey = String(userKey || '').trim().toLowerCase();
  const normalizedUserEmail = String(userEmail || '').trim().toLowerCase();
  const normalizedUserName = String(userName || '').trim() || 'Guest';
  return {
    userKey: normalizedUserKey || null,
    userEmail: normalizedUserEmail || null,
    userName: normalizedUserName
  };
}

function normalizeDirectoryName(value, email) {
  const normalizedName = String(value || '').trim();
  if (normalizedName && normalizedName.toLowerCase() !== 'guest') {
    return normalizedName;
  }

  const emailPrefix = String(email || '').split('@')[0].trim();
  return emailPrefix || 'Người dùng';
}

function mergeDirectoryProfile(store, payload = {}) {
  const email = String(payload.userEmail || '')
    .trim()
    .toLowerCase();
  if (!email) return;

  const incomingDate = payload.lastSeenAt ? new Date(payload.lastSeenAt) : null;
  const existing = store.get(email);
  const nextName = normalizeDirectoryName(payload.authorName, email);
  const nextAvatar = String(payload.avatarUrl || '').trim() || null;

  if (!existing) {
    store.set(email, {
      userEmail: email,
      authorName: nextName,
      avatarUrl: nextAvatar,
      lastSeenAt: incomingDate && !Number.isNaN(incomingDate.getTime()) ? incomingDate.toISOString() : null
    });
    return;
  }

  const existingDate = existing.lastSeenAt ? new Date(existing.lastSeenAt) : null;
  const shouldReplaceName =
    !existing.authorName ||
    existing.authorName === 'Người dùng' ||
    existing.authorName.toLowerCase() === 'guest';
  const shouldReplaceAvatar = !existing.avatarUrl && nextAvatar;
  const shouldReplaceDate =
    incomingDate &&
    !Number.isNaN(incomingDate.getTime()) &&
    (!existingDate || Number.isNaN(existingDate.getTime()) || incomingDate > existingDate);

  if (shouldReplaceName) {
    existing.authorName = nextName;
  }
  if (shouldReplaceAvatar) {
    existing.avatarUrl = nextAvatar;
  }
  if (shouldReplaceDate) {
    existing.lastSeenAt = incomingDate.toISOString();
  }
}

async function getDirectoryProfiles(event) {
  const [wishProfiles, chatProfiles, gameProfiles] = await Promise.all([
    Wish.find({
      eventId: event._id,
      userEmail: { $nin: [null, ''] }
    })
      .sort({ createdAt: -1 })
      .select({ userEmail: 1, authorName: 1, avatarUrl: 1, createdAt: 1 })
      .lean(),
    ChatMessage.find({
      eventSlug: event.slug,
      userEmail: { $nin: [null, ''] }
    })
      .sort({ createdAt: -1 })
      .select({ userEmail: 1, authorName: 1, avatarUrl: 1, createdAt: 1 })
      .lean(),
    GameAttempt.find({
      eventSlug: event.slug,
      userEmail: { $nin: [null, ''] }
    })
      .sort({ createdAt: -1 })
      .select({ userEmail: 1, authorName: 1, createdAt: 1 })
      .lean()
  ]);

  const store = new Map();

  wishProfiles.forEach((item) =>
    mergeDirectoryProfile(store, {
      userEmail: item.userEmail,
      authorName: item.authorName,
      avatarUrl: item.avatarUrl,
      lastSeenAt: item.createdAt
    })
  );
  chatProfiles.forEach((item) =>
    mergeDirectoryProfile(store, {
      userEmail: item.userEmail,
      authorName: item.authorName,
      avatarUrl: item.avatarUrl,
      lastSeenAt: item.createdAt
    })
  );
  gameProfiles.forEach((item) =>
    mergeDirectoryProfile(store, {
      userEmail: item.userEmail,
      authorName: item.authorName,
      lastSeenAt: item.createdAt
    })
  );

  return Array.from(store.values()).sort((left, right) => {
    const leftTime = left.lastSeenAt ? new Date(left.lastSeenAt).getTime() : 0;
    const rightTime = right.lastSeenAt ? new Date(right.lastSeenAt).getTime() : 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.authorName.localeCompare(right.authorName, 'vi');
  });
}

async function getGlobalDirectoryProfiles() {
  const [wishProfiles, chatProfiles, gameProfiles] = await Promise.all([
    Wish.find({
      userEmail: { $nin: [null, ''] }
    })
      .sort({ createdAt: -1 })
      .select({ userEmail: 1, authorName: 1, avatarUrl: 1, createdAt: 1 })
      .lean(),
    ChatMessage.find({
      userEmail: { $nin: [null, ''] }
    })
      .sort({ createdAt: -1 })
      .select({ userEmail: 1, authorName: 1, avatarUrl: 1, createdAt: 1 })
      .lean(),
    GameAttempt.find({
      userEmail: { $nin: [null, ''] }
    })
      .sort({ createdAt: -1 })
      .select({ userEmail: 1, authorName: 1, createdAt: 1 })
      .lean()
  ]);

  const store = new Map();

  wishProfiles.forEach((item) =>
    mergeDirectoryProfile(store, {
      userEmail: item.userEmail,
      authorName: item.authorName,
      avatarUrl: item.avatarUrl,
      lastSeenAt: item.createdAt
    })
  );
  chatProfiles.forEach((item) =>
    mergeDirectoryProfile(store, {
      userEmail: item.userEmail,
      authorName: item.authorName,
      avatarUrl: item.avatarUrl,
      lastSeenAt: item.createdAt
    })
  );
  gameProfiles.forEach((item) =>
    mergeDirectoryProfile(store, {
      userEmail: item.userEmail,
      authorName: item.authorName,
      lastSeenAt: item.createdAt
    })
  );

  return Array.from(store.values()).sort((left, right) => {
    const leftTime = left.lastSeenAt ? new Date(left.lastSeenAt).getTime() : 0;
    const rightTime = right.lastSeenAt ? new Date(right.lastSeenAt).getTime() : 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.authorName.localeCompare(right.authorName, 'vi');
  });
}

function toPublicWish(raw = {}) {
  return {
    _id: raw._id,
    eventId: raw.eventId,
    userUid: raw.userUid || null,
    avatarUrl: raw.avatarUrl || null,
    authorName: raw.authorName || 'Guest',
    content: raw.content || '',
    likeUserKeys: Array.isArray(raw.likeUserKeys) ? raw.likeUserKeys : [],
    likeUserProfiles: normalizeLikeProfiles(raw.likeUserProfiles),
    likesCount: Math.max(0, Number(raw.likesCount || 0)),
    isApproved: Boolean(raw.isApproved),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
}

function toPublicGreetingCard(raw = {}) {
  return {
    id: String(raw._id || raw.id || '').trim(),
    recipientName: raw.recipientName || 'Người nhận',
    recipientEmail: raw.recipientEmail || null,
    message: raw.message || '',
    templateId: raw.templateId || null,
    templateTitle: raw.templateTitle || null,
    templateCategory: raw.templateCategory || null,
    imageUrl: raw.imageUrl || null,
    templateAccent: raw.templateAccent || null,
    templateSurface: raw.templateSurface || null,
    aiPrompt: raw.aiPrompt || '',
    senderUid: raw.senderUid || null,
    senderEmail: raw.senderEmail || null,
    senderName: raw.senderName || 'Ẩn danh',
    mailStatus: raw.mailStatus || 'queued',
    mailError: raw.mailError || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
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

async function getWheelStats(eventSlug) {
  const rewardLabels = await GameReward.distinct('label', {
    eventSlug,
    gameType: 'wheel'
  });

  if (!rewardLabels.length) {
    return {
      rewardStats: [],
      recentWinners: []
    };
  }

  const [rewardStats, recentWinners] = await Promise.all([
    GameAttempt.aggregate([
      {
        $match: {
          eventSlug,
          gameType: 'wheel',
          rewardLabel: { $in: rewardLabels }
        }
      },
      {
        $group: {
          _id: '$rewardLabel',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          label: '$_id',
          count: 1
        }
      },
      { $sort: { count: -1, label: 1 } }
    ]),
    GameAttempt.find({
      eventSlug,
      gameType: 'wheel',
      rewardLabel: { $in: rewardLabels }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select({ _id: 1, authorName: 1, rewardLabel: 1, createdAt: 1 })
      .lean()
  ]);

  return {
    rewardStats,
    recentWinners
  };
}

router.get(
  '/active-event',
  asyncHandler(async (req, res) => {
  const event = await Event.findOne({ isActive: true, status: 'published' }).lean();
  if (!event) {
    return res.status(404).json({ message: 'No active event found' });
  }
  return res.json(event);
  })
);

router.get(
  '/events/:slug',
  asyncHandler(async (req, res) => {
  const event = await findPublicEventBySlug(req.params.slug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wishes = await Wish.find({ eventId: event._id, isApproved: true })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ event, wishes: wishes.map((wish) => toPublicWish(wish)) });
  })
);

router.post(
  '/wishes',
  asyncHandler(async (req, res) => {
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
  if (normalizedContent.length > MAX_WISH_CONTENT_LENGTH) {
    return res.status(400).json({
      message: `Nội dung lời chúc quá dài (tối đa ${MAX_WISH_CONTENT_LENGTH} ký tự).`
    });
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

  const publicWish = toPublicWish(wish.toObject());
  const io = req.app?.locals?.io;
  if (io) {
    io.to(`event:${eventSlug}`).emit('wish_created', publicWish);
  }

  return res.status(201).json(publicWish);
  })
);

router.get(
  '/directory/:eventSlug/people',
  asyncHandler(async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  if (!eventSlug) {
    return res.status(400).json({ message: 'eventSlug is required' });
  }

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const profiles = await getDirectoryProfiles(event);

  return res.json({
    eventSlug,
    totalCount: profiles.length,
    people: profiles
  });
  })
);

router.get(
  '/directory/people',
  asyncHandler(async (req, res) => {
    const profiles = await getGlobalDirectoryProfiles();

    return res.json({
      totalCount: profiles.length,
      people: profiles
    });
  })
);

router.post(
  '/cards/ai-message',
  asyncHandler(async (req, res) => {
  const messagePrompt = String(req.body?.messagePrompt || '').trim();
  const templateTitle = String(req.body?.templateTitle || '').trim();
  const templateCategory = String(req.body?.templateCategory || '').trim();

  if (!messagePrompt) {
    return res.status(400).json({ message: 'messagePrompt is required' });
  }

  try {
    const suggestion = await generateCardMessage({
      messagePrompt,
      templateTitle,
      templateCategory
    });

    return res.json({
      suggestion
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 502);
    return res.status(statusCode).json({
      message: error.message || 'AI message generation failed'
    });
  }
  })
);

router.get(
  '/cards/bootstrap',
  asyncHandler(async (req, res) => {
    const viewerEmail = String(req.query.viewerEmail || '')
      .trim()
      .toLowerCase();
    const viewerUid = String(req.query.viewerUid || '')
      .trim()
      .toLowerCase();
    const viewerKey = viewerEmail || viewerUid;

    const [templates, cardDocs] = await Promise.all([
      listGreetingCardTemplates(),
      GreetingCard.find({})
        .sort({ createdAt: -1 })
        .limit(300)
        .lean()
    ]);

    const cards = cardDocs.map((item) => toPublicGreetingCard(item));
    const myReceivedCards = viewerEmail
      ? cards.filter((card) => String(card.recipientEmail || '').trim().toLowerCase() === viewerEmail)
      : [];
    const mySentCards = viewerKey
      ? cards.filter((card) => {
          const senderEmail = String(card.senderEmail || '').trim().toLowerCase();
          const senderUid = String(card.senderUid || '').trim().toLowerCase();
          return senderEmail === viewerEmail || senderUid === viewerUid;
        })
      : [];

    return res.json({
      templates: templates.map((template) => ({
        id: template.templateId,
        title: template.title,
        category: template.category,
        imageUrl: template.imageUrl,
        accent: template.accent,
        surface: template.surface
      })),
      cards,
      myReceivedCards,
      mySentCards,
      mailEnabled: isMailConfigured()
    });
  })
);

router.post(
  '/cards/send',
  asyncHandler(async (req, res) => {
    const identity = extractUserIdentity(req.body);
    if (!identity.userKey) {
      return res.status(401).json({ message: 'Cần đăng nhập trước khi gửi thiệp.' });
    }

    const recipientName = String(req.body?.recipientName || '').trim();
    const recipientEmail = String(req.body?.recipientEmail || '')
      .trim()
      .toLowerCase();
    const message = String(req.body?.message || '').trim();
    const templateId = String(req.body?.templateId || '').trim();
    const aiPrompt = String(req.body?.aiPrompt || '').trim();

    if (!recipientName || !recipientEmail || !message || !templateId) {
      return res.status(400).json({
        message: 'recipientName, recipientEmail, message, templateId là bắt buộc.'
      });
    }

    const templates = await listGreetingCardTemplates();
    const template = templates.find((item) => item.templateId === templateId);
    if (!template) {
      return res.status(404).json({ message: 'Không tìm thấy mẫu thiệp đã chọn.' });
    }

    const card = await GreetingCard.create({
      recipientName,
      recipientEmail,
      message,
      templateId: template.templateId,
      templateTitle: template.title,
      templateCategory: template.category,
      imageUrl: template.imageUrl,
      templateAccent: template.accent,
      templateSurface: template.surface,
      aiPrompt: aiPrompt || null,
      senderUid: identity.userUid || null,
      senderEmail: identity.userEmail || null,
      senderName: identity.authorName || 'Ẩn danh',
      mailStatus: isMailConfigured() ? 'queued' : 'skipped'
    });

    if (isMailConfigured()) {
      try {
        const emailPayload = buildGreetingCardEmail({
          ...card.toObject(),
          createdAt: card.createdAt
        });
        const info = await sendMail({
          from: process.env.MAIL_FROM,
          to: recipientEmail,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html
        });

        card.mailStatus = 'sent';
        card.mailMessageId = info?.messageId || null;
        card.mailError = null;
        await card.save();
      } catch (error) {
        card.mailStatus = 'failed';
        card.mailError = String(error?.message || 'Không gửi được email').slice(0, 500);
        await card.save();
      }
    }

    return res.status(201).json({
      card: toPublicGreetingCard(card.toObject()),
      mailEnabled: isMailConfigured()
    });
  })
);

router.get(
  '/chat/:eventSlug/messages',
  asyncHandler(async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 40, 1), 100);

  if (!eventSlug) {
    return res.status(400).json({ message: 'eventSlug is required' });
  }

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const [messages, totalCount] = await Promise.all([
    ChatMessage.find({ eventSlug })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    ChatMessage.countDocuments({ eventSlug })
  ]);

  return res.json({
    messages: messages.reverse(),
    totalCount: Math.max(0, Number(totalCount || 0))
  });
  })
);

router.post(
  '/wishes/:wishId/like',
  asyncHandler(async (req, res) => {
  const { wishId } = req.params;
  const { userUid, userEmail, authorName } = req.body;
  const normalizedUserUid = String(userUid || '').trim().toLowerCase();
  const normalizedUserEmail = String(userEmail || '').trim().toLowerCase();
  const normalizedAuthorName = String(authorName || '').trim();

  if (!mongoose.Types.ObjectId.isValid(wishId)) {
    return res.status(400).json({ message: 'Invalid wish id' });
  }

  const candidateKeys = Array.from(
    new Set([normalizedUserEmail, normalizedUserUid].filter(Boolean))
  );
  const userKey = normalizedUserEmail || normalizedUserUid;

  if (!userKey || !candidateKeys.length) {
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

  const unlikeUpdate = {
    $pull: {
      likeUserKeys: { $in: candidateKeys },
      likeUserProfiles: { userKey: { $in: candidateKeys } }
    },
    $inc: { likesCount: -1 }
  };
  if (normalizedUserEmail) {
    unlikeUpdate.$pull.likeUserEmails = normalizedUserEmail;
  }

  const unliked = await Wish.findOneAndUpdate(
    { _id: wishId, likeUserKeys: { $in: candidateKeys } },
    unlikeUpdate,
    { new: true }
  ).lean();

  if (unliked) {
    const currentLikesCount = Math.max(0, Number(unliked.likesCount || 0));
    const keysCount = Array.isArray(unliked.likeUserKeys) ? unliked.likeUserKeys.length : 0;
    const safeLikesCount = Math.min(currentLikesCount, keysCount);
    let safeWish = unliked;

    if (safeLikesCount !== currentLikesCount) {
      await Wish.updateOne({ _id: wishId }, { $set: { likesCount: safeLikesCount } });
      const latestWish = await Wish.findById(wishId).lean();
      if (latestWish) safeWish = latestWish;
    } else {
      safeWish.likesCount = safeLikesCount;
    }

    const publicWish = toPublicWish(safeWish);
    const io = req.app?.locals?.io;
    if (io && event?.slug) {
      io.to(`event:${event.slug}`).emit('wish_likes_updated', {
        wishId,
        likesCount: publicWish.likesCount,
        likeUserKeys: publicWish.likeUserKeys,
        likeUserProfiles: publicWish.likeUserProfiles
      });
    }

    return res.json({
      wishId,
      likesCount: publicWish.likesCount,
      liked: false,
      likeUserKeys: publicWish.likeUserKeys,
      likeUserProfiles: publicWish.likeUserProfiles
    });
  }

  const likeUpdate = {
    $addToSet: { likeUserKeys: userKey },
    $inc: { likesCount: 1 }
  };
  if (normalizedUserEmail) {
    likeUpdate.$addToSet.likeUserEmails = normalizedUserEmail;
  }

  const liked = await Wish.findOneAndUpdate(
    { _id: wishId, likeUserKeys: { $nin: candidateKeys } },
    likeUpdate,
    { new: true }
  ).lean();

  if (!liked) {
    const currentWish = await Wish.findById(wishId).lean();
    const publicWish = toPublicWish(currentWish || {});
    const fallbackLikesCount = publicWish.likesCount;

    const io = req.app?.locals?.io;
    if (io && event?.slug) {
      io.to(`event:${event.slug}`).emit('wish_likes_updated', {
        wishId,
        likesCount: fallbackLikesCount,
        likeUserKeys: publicWish.likeUserKeys,
        likeUserProfiles: publicWish.likeUserProfiles
      });
    }

    return res.json({
      wishId,
      likesCount: fallbackLikesCount,
      liked: true,
      likeUserKeys: publicWish.likeUserKeys,
      likeUserProfiles: publicWish.likeUserProfiles
    });
  }

  const profile = buildLikeProfile({
    userKey,
    userEmail: normalizedUserEmail,
    userName: normalizedAuthorName || normalizedUserEmail || 'Guest'
  });
  await Wish.updateOne(
    { _id: wishId },
    { $pull: { likeUserProfiles: { userKey: { $in: candidateKeys } } } }
  );
  await Wish.updateOne({ _id: wishId }, { $push: { likeUserProfiles: profile } });

  const latestWish = await Wish.findById(wishId).lean();
  const currentLikesCount = Math.max(0, Number(latestWish?.likesCount || 0));
  const keysCount = Array.isArray(latestWish?.likeUserKeys) ? latestWish.likeUserKeys.length : 0;
  const safeLikesCount = Math.min(currentLikesCount, keysCount);
  if (safeLikesCount !== currentLikesCount) {
    await Wish.updateOne({ _id: wishId }, { $set: { likesCount: safeLikesCount } });
    if (latestWish) latestWish.likesCount = safeLikesCount;
  }

  const publicWish = toPublicWish(latestWish || {});
  const io = req.app?.locals?.io;
  if (io && event?.slug) {
    io.to(`event:${event.slug}`).emit('wish_likes_updated', {
      wishId,
      likesCount: publicWish.likesCount,
      likeUserKeys: publicWish.likeUserKeys,
      likeUserProfiles: publicWish.likeUserProfiles
    });
  }

  return res.json({
    wishId,
    likesCount: publicWish.likesCount,
    liked: true,
    likeUserKeys: publicWish.likeUserKeys,
    likeUserProfiles: publicWish.likeUserProfiles
  });
  })
);

router.get(
  '/games/:eventSlug/bootstrap',
  asyncHandler(async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  if (!eventSlug) return res.status(400).json({ message: 'eventSlug is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wheelPool = await getWheelPool(eventSlug);
  const remainingCount = wheelPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const { rewardStats, recentWinners } = await getWheelStats(eventSlug);

  return res.json({
    eventSlug,
    wheelPool,
    remainingCount,
    rewardStats,
    recentWinners
  });
  })
);

router.post(
  '/games/:eventSlug/reset',
  asyncHandler(async (req, res) => {
  const eventSlug = String(req.params.eventSlug || '').trim();
  if (!eventSlug) return res.status(400).json({ message: 'eventSlug is required' });

  const identity = extractUserIdentity(req.body);
  if (!identity.userKey) return res.status(401).json({ message: 'Login is required' });

  const event = await findPublicEventBySlug(eventSlug);
  if (!event) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  await seedMiniGames(eventSlug);
  await GameAttempt.deleteMany({ eventSlug, gameType: 'wheel' });

  const wheelPool = await getWheelPool(eventSlug);
  const remainingCount = wheelPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const { rewardStats, recentWinners } = await getWheelStats(eventSlug);

  return res.json({
    wheelPool,
    remainingCount,
    rewardStats,
    recentWinners
  });
  })
);

router.post(
  '/games/:eventSlug/wheel',
  asyncHandler(async (req, res) => {
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
  const { rewardStats, recentWinners } = await getWheelStats(eventSlug);

  return res.json({
    rewardLabel,
    remainingPool,
    remainingCount,
    attemptId: attempt._id,
    rewardStats,
    recentWinners
  });
  })
);

module.exports = router;

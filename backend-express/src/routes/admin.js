const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Wish = require('../models/Wish');

const router = express.Router();

function requireAdminKey(req, res, next) {
  const requestKey = req.headers['x-admin-key'];
  if (!requestKey || requestKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

router.use(requireAdminKey);

router.get('/events', async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 }).lean();
  res.json(events);
});

router.post('/events', async (req, res) => {
  const { name, slug, publicUrl, description, startAt, endAt } = req.body;
  if (!name || !slug || !publicUrl) {
    return res.status(400).json({ message: 'name, slug, publicUrl are required' });
  }

  const event = await Event.create({
    name,
    slug,
    publicUrl,
    description: description || '',
    startAt: startAt || null,
    endAt: endAt || null,
    status: 'published'
  });

  res.status(201).json(event);
});

router.patch('/events/:id/active', async (req, res) => {
  const target = await Event.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'Event not found' });
  }

  await Event.updateMany({}, { $set: { isActive: false } });
  target.isActive = true;
  await target.save();

  res.json({ message: 'Active event updated', event: target });
});

router.get('/wishes/:wishId/voters', async (req, res) => {
  const wishId = String(req.params.wishId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(wishId)) {
    return res.status(400).json({ message: 'Invalid wish id' });
  }

  const wish = await Wish.findById(wishId)
    .select({
      _id: 1,
      authorName: 1,
      likesCount: 1,
      likeUserKeys: 1,
      likeUserEmails: 1,
      createdAt: 1
    })
    .lean();

  if (!wish) {
    return res.status(404).json({ message: 'Wish not found' });
  }

  const fromEmailField = Array.isArray(wish.likeUserEmails) ? wish.likeUserEmails : [];
  const fromKeys = Array.isArray(wish.likeUserKeys)
    ? wish.likeUserKeys.filter((item) => String(item || '').includes('@'))
    : [];

  const voterEmails = Array.from(
    new Set(
      [...fromEmailField, ...fromKeys]
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();

  const likesCount = Math.max(0, Number(wish.likesCount || 0));
  const unresolvedVotes = Math.max(0, likesCount - voterEmails.length);

  return res.json({
    wishId: String(wish._id),
    authorName: wish.authorName || 'Guest',
    likesCount,
    voterEmails,
    unresolvedVotes
  });
});

module.exports = router;

const express = require('express');
const Event = require('../models/Event');
const Wish = require('../models/Wish');

const router = express.Router();

router.get('/active-event', async (req, res) => {
  const event = await Event.findOne({ isActive: true, status: 'published' }).lean();
  if (!event) {
    return res.status(404).json({ message: 'No active event found' });
  }
  return res.json(event);
});

router.get('/events/:slug', async (req, res) => {
  const event = await Event.findOne({
    slug: req.params.slug,
    status: 'published'
  }).lean();

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (!event.isActive) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wishes = await Wish.find({ eventId: event._id, isApproved: true })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ event, wishes });
});

router.post('/wishes', async (req, res) => {
  const { eventSlug, authorName, content, userUid, userEmail } = req.body;
  const normalizedAuthorName = String(authorName || '').trim();
  const normalizedContent = String(content || '').trim();

  if (!eventSlug || !normalizedAuthorName || !normalizedContent) {
    return res.status(400).json({ message: 'eventSlug, authorName, content are required' });
  }

  const event = await Event.findOne({ slug: eventSlug, status: 'published' });
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (!event.isActive) {
    return res.status(403).json({ message: 'This event is not public right now' });
  }

  const wish = await Wish.create({
    eventId: event._id,
    userUid: userUid || null,
    userEmail: userEmail || null,
    authorName: normalizedAuthorName,
    content: normalizedContent,
    isApproved: true
  });

  return res.status(201).json(wish);
});

module.exports = router;

const express = require('express');
const Event = require('../models/Event');

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

module.exports = router;

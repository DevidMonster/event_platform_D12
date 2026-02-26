const Event = require('../models/Event');
const ChatMessage = require('../models/ChatMessage');

function normalizeText(value = '') {
  return String(value || '').trim();
}

async function isPublicEvent(eventSlug) {
  const slug = normalizeText(eventSlug);
  if (!slug) return false;

  const event = await Event.findOne({ slug, status: 'published', isActive: true }).lean();
  return Boolean(event);
}

function setupChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_room', async (payload = {}) => {
      const eventSlug = normalizeText(payload.eventSlug);
      const userUid = normalizeText(payload.userUid);
      const userEmail = normalizeText(payload.userEmail).toLowerCase();

      if (!eventSlug || (!userUid && !userEmail)) {
        socket.emit('chat_error', { message: 'Bạn cần đăng nhập để vào chat.' });
        return;
      }

      const canJoin = await isPublicEvent(eventSlug);
      if (!canJoin) {
        socket.emit('chat_error', { message: 'Sự kiện hiện chưa mở chat công khai.' });
        return;
      }

      socket.join(`chat:${eventSlug}`);
      socket.data.userKey = userUid || userEmail;
      socket.data.eventSlug = eventSlug;
      socket.emit('room_joined', { eventSlug });
    });

    socket.on('send_message', async (payload = {}) => {
      const eventSlug = normalizeText(payload.eventSlug);
      const userUid = normalizeText(payload.userUid);
      const userEmail = normalizeText(payload.userEmail).toLowerCase();
      const authorName = normalizeText(payload.authorName) || 'Khách';
      const avatarUrl = normalizeText(payload.avatarUrl) || null;
      const message = normalizeText(payload.message);

      if (!eventSlug || (!userUid && !userEmail)) {
        socket.emit('chat_error', { message: 'Bạn cần đăng nhập để gửi tin nhắn.' });
        return;
      }

      if (!message) {
        socket.emit('chat_error', { message: 'Tin nhắn không được để trống.' });
        return;
      }

      const canChat = await isPublicEvent(eventSlug);
      if (!canChat) {
        socket.emit('chat_error', { message: 'Sự kiện hiện chưa mở chat công khai.' });
        return;
      }

      const saved = await ChatMessage.create({
        eventSlug,
        userUid: userUid || userEmail,
        userEmail: userEmail || null,
        authorName,
        avatarUrl,
        message
      });

      const room = `chat:${eventSlug}`;
      io.to(room).emit('new_message', {
        _id: saved._id,
        eventSlug: saved.eventSlug,
        userUid: saved.userUid,
        userEmail: saved.userEmail,
        authorName: saved.authorName,
        avatarUrl: saved.avatarUrl,
        message: saved.message,
        createdAt: saved.createdAt
      });
    });
  });
}

module.exports = { setupChatSocket };

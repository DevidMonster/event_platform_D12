const ChatMessage = require('../models/ChatMessage');

const SHARED_CHAT_SCOPE = 'shared-chat';

function normalizeText(value = '') {
  return String(value || '').trim();
}

function resolveChatScope() {
  return SHARED_CHAT_SCOPE;
}

function setupChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_event_stream', (payload = {}) => {
      const eventSlug = normalizeText(payload.eventSlug) || SHARED_CHAT_SCOPE;
      socket.join(`event:${eventSlug}`);
      socket.emit('event_stream_joined', { eventSlug });
    });

    socket.on('join_room', (payload = {}) => {
      const userUid = normalizeText(payload.userUid);
      const userEmail = normalizeText(payload.userEmail).toLowerCase();

      if (!userUid && !userEmail) {
        socket.emit('chat_error', { message: 'Bạn cần đăng nhập để vào chat.' });
        return;
      }

      const chatScope = resolveChatScope();
      socket.join(`chat:${chatScope}`);
      socket.data.userKey = userUid || userEmail;
      socket.data.eventSlug = chatScope;
      socket.emit('room_joined', { eventSlug: chatScope });
    });

    socket.on('send_message', async (payload = {}) => {
      const userUid = normalizeText(payload.userUid);
      const userEmail = normalizeText(payload.userEmail).toLowerCase();
      const authorName = normalizeText(payload.authorName) || 'Khách';
      const avatarUrl = normalizeText(payload.avatarUrl) || null;
      const message = normalizeText(payload.message);

      if (!userUid && !userEmail) {
        socket.emit('chat_error', { message: 'Bạn cần đăng nhập để gửi tin nhắn.' });
        return;
      }

      if (!message) {
        socket.emit('chat_error', { message: 'Tin nhắn không được để trống.' });
        return;
      }

      const chatScope = resolveChatScope();
      const saved = await ChatMessage.create({
        eventSlug: chatScope,
        userUid: userUid || userEmail,
        userEmail: userEmail || null,
        authorName,
        avatarUrl,
        message
      });

      io.to(`chat:${chatScope}`).emit('new_message', {
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

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { seedDefaultEvent } = require('./seed');
const { setupChatSocket } = require('./socket/chat');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload quá lớn.' });
  }
  if (err?.name === 'ValidationError') {
    const firstMessage = Object.values(err.errors || {})[0]?.message;
    return res.status(400).json({ message: firstMessage || 'Dữ liệu không hợp lệ.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'Dữ liệu đầu vào không hợp lệ.' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Dữ liệu đã tồn tại.' });
  }
  return res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.locals.io = io;
setupChatSocket(io);

async function start() {
  await connectDB();
  await seedDefaultEvent();
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

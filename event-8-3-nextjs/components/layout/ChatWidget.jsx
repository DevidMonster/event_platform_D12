'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function ChatAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="chat-avatar" referrerPolicy="no-referrer" />;
  }
  return <div className="chat-avatar fallback">{getInitials(name)}</div>;
}

export default function ChatWidget({ eventSlug, user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatCount, setChatCount] = useState(0);
  const [input, setInput] = useState('');
  const [chatError, setChatError] = useState('');

  const listRef = useRef(null);
  const socketRef = useRef(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || apiUrl;
  const canChat = Boolean(user?.uid || user?.email);
  const authorName = useMemo(() => user?.displayName || user?.email || 'Khách', [user]);

  const badgeText = chatCount > 99 ? '99+' : String(chatCount);

  function scrollToBottom(behavior = 'auto') {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior
    });
  }

  useEffect(() => {
    if (!eventSlug || !apiUrl) return undefined;

    let mounted = true;

    async function preloadMessages() {
      try {
        const res = await fetch(`${apiUrl}/api/public/chat/${eventSlug}/messages?limit=50`, {
          cache: 'no-store'
        });
        const json = await res.json();
        if (!res.ok || !mounted) return;

        const nextMessages = Array.isArray(json.messages) ? json.messages : [];
        const nextCount = Math.max(0, Number(json.totalCount || nextMessages.length || 0));
        setMessages((prev) => (prev.length > 0 ? prev : nextMessages));
        setChatCount((prev) => (prev > nextCount ? prev : nextCount));
      } catch {
        // Ignore preload errors; full load will show explicit error when chat opens.
      }
    }

    preloadMessages();

    return () => {
      mounted = false;
    };
  }, [eventSlug, apiUrl]);

  useEffect(() => {
    if (!open || !eventSlug || !canChat || !socketUrl) return undefined;

    let mounted = true;

    async function loadHistory() {
      setLoading(true);
      setChatError('');
      try {
        const res = await fetch(`${apiUrl}/api/public/chat/${eventSlug}/messages?limit=50`, {
          cache: 'no-store'
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được lịch sử chat');
        if (mounted) {
          const nextMessages = Array.isArray(json.messages) ? json.messages : [];
          setMessages(nextMessages);
          setChatCount(Math.max(0, Number(json.totalCount || nextMessages.length || 0)));
          window.requestAnimationFrame(() => scrollToBottom('auto'));
        }
      } catch (e) {
        if (mounted) setChatError(e.message || 'Không tải được lịch sử chat');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHistory();

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', {
        eventSlug,
        userUid: user?.uid || null,
        userEmail: user?.email || null
      });
    });

    socket.on('new_message', (message) => {
      setMessages((prev) => {
        const exists = prev.some((item) => String(item._id) === String(message._id));
        if (exists) return prev;
        const next = [...prev, message];
        setChatCount((count) => count + 1);
        window.requestAnimationFrame(() => scrollToBottom('smooth'));
        return next;
      });
    });

    socket.on('chat_error', (payload) => {
      setChatError(payload?.message || 'Lỗi chat realtime');
    });

    return () => {
      mounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open, eventSlug, canChat, socketUrl, apiUrl, user?.uid, user?.email]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    scrollToBottom('auto');
  }, [messages, open]);

  function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !canChat || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      eventSlug,
      userUid: user?.uid || null,
      userEmail: user?.email || null,
      authorName,
      avatarUrl: user?.photoURL || null,
      message: text
    });

    setInput('');
    window.requestAnimationFrame(() => scrollToBottom('smooth'));
  }

  return (
    <div className="chat-widget-root">
      <button className={open ? 'chat-fab open' : 'chat-fab'} onClick={() => setOpen((v) => !v)}>
        <span>{open ? '✖' : '💬'}</span>
        {chatCount > 0 && <span className="chat-fab-badge">{badgeText}</span>}
      </button>

      <section className={open ? 'chat-panel show' : 'chat-panel'}>
        <header className="chat-panel-header">
          <h4>Chat sự kiện</h4>
          <p>{canChat ? `Xin chào, ${authorName}` : 'Đăng nhập Google để tham gia chat'}</p>
        </header>

        <div className="chat-messages" ref={listRef}>
          {loading && <p className="chat-note">Đang tải tin nhắn...</p>}
          {!loading && messages.length === 0 && <p className="chat-note">Chưa có tin nhắn nào.</p>}
          {messages.map((item) => {
            const mine =
              (user?.uid && item.userUid === user.uid) ||
              (user?.email && item.userEmail === String(user.email).toLowerCase());
            return (
              <article key={item._id} className={mine ? 'chat-item mine' : 'chat-item'}>
                <ChatAvatar name={item.authorName} avatarUrl={item.avatarUrl} />
                <div className="chat-bubble">
                  <p className="chat-author">{item.authorName}</p>
                  <p className="chat-text">{item.message}</p>
                </div>
              </article>
            );
          })}
        </div>

        {chatError && <p className="chat-error">{chatError}</p>}

        <form className="chat-form" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canChat ? 'Nhập tin nhắn...' : 'Đăng nhập để chat'}
            disabled={!canChat}
          />
          <button type="submit" disabled={!canChat || !input.trim()}>
            Gửi
          </button>
        </form>
      </section>
    </div>
  );
}

'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { io } from 'socket.io-client';
import { auth, googleProvider, hasFirebaseConfig } from '../lib/firebase';
import { eventSlug } from '../lib/event-content';

const EventAppContext = createContext(null);

export function EventAppProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  const [likeLoadingIds, setLikeLoadingIds] = useState([]);
  const socketRef = useRef(null);

  const wishes = useMemo(() => data?.wishes || [], [data]);
  const participantsCount = useMemo(() => {
    const keys = new Set();
    wishes.forEach((wish) => {
      if (wish.userUid) keys.add(`uid:${wish.userUid}`);
      else if (wish.userEmail) keys.add(`email:${wish.userEmail}`);
      else if (wish.authorName) keys.add(`name:${wish.authorName.toLowerCase()}`);
    });
    return keys.size;
  }, [wishes]);

  const myWishCount = useMemo(() => {
    if (!user) return 0;
    return wishes.filter(
      (wish) =>
        (user.uid && wish.userUid === user.uid) ||
        (user.email && wish.userEmail === user.email.toLowerCase())
    ).length;
  }, [wishes, user]);

  const currentUserKey = useMemo(
    () => String(user?.email || user?.uid || '').trim().toLowerCase(),
    [user]
  );
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;

  async function load() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/events/${eventSlug}`);
      if (!res.ok) throw new Error('Không tải được sự kiện 8/3');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socketUrl || !eventSlug) return undefined;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_event_stream', { eventSlug });
    });

    socket.on('wish_created', (incomingWish) => {
      const wishId = String(incomingWish?._id || '').trim();
      if (!wishId) return;

      setData((prev) => {
        if (!prev?.wishes) return prev;
        const exists = prev.wishes.some((item) => String(item?._id) === wishId);
        if (exists) return prev;
        return {
          ...prev,
          wishes: [incomingWish, ...prev.wishes]
        };
      });
    });

    socket.on('wish_likes_updated', (payload = {}) => {
      const wishId = String(payload.wishId || '').trim();
      if (!wishId) return;
      const likesCount = Math.max(0, Number(payload.likesCount || 0));

      setData((prev) => {
        if (!prev?.wishes) return prev;

        let changed = false;
        const nextWishes = prev.wishes.map((wish) => {
          if (String(wish?._id) !== wishId) return wish;
          changed = true;
          return { ...wish, likesCount };
        });

        if (!changed) return prev;
        return { ...prev, wishes: nextWishes };
      });
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [socketUrl]);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setAuthLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function submitWish(e) {
    e.preventDefault();
    if (!user) {
      setError('Bạn cần đăng nhập để gửi lời chúc.');
      return;
    }

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      setError('Vui lòng nhập nội dung lời chúc.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug,
          authorName: user.displayName || user.email || 'Guest',
          content: normalizedContent,
          userUid: user.uid || null,
          userEmail: user.email || null,
          avatarUrl: user.photoURL || null
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gửi lời chúc thất bại');
      const createdWish = json;

      setContent('');
      setData((prev) => {
        if (!prev?.wishes) return prev;
        const exists = prev.wishes.some((item) => String(item?._id) === String(createdWish?._id));
        if (exists) return prev;
        return {
          ...prev,
          wishes: [createdWish, ...prev.wishes]
        };
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function isWishLikedByCurrentUser(wish) {
    if (!currentUserKey) return false;
    const keys = Array.isArray(wish.likeUserKeys) ? wish.likeUserKeys : [];
    return keys.includes(currentUserKey);
  }

  async function likeWish(wishId) {
    if (!user) {
      setError('Bạn cần đăng nhập để thả tim.');
      return;
    }

    if (!wishId) return;
    setLikeLoadingIds((prev) => [...prev, wishId]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/wishes/${wishId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: user.uid || null,
          userEmail: user.email || null
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không thể thả tim');

      setData((prev) => {
        if (!prev?.wishes) return prev;
        return {
          ...prev,
          wishes: prev.wishes.map((wish) => {
            if (wish._id !== wishId) return wish;
            const currentKeys = Array.isArray(wish.likeUserKeys) ? wish.likeUserKeys : [];
            const shouldLike = Boolean(json.liked);
            const hasCurrentUser = currentKeys.includes(currentUserKey);
            let nextKeys = currentKeys;

            if (shouldLike && !hasCurrentUser) {
              nextKeys = [...currentKeys, currentUserKey];
            } else if (!shouldLike && hasCurrentUser) {
              nextKeys = currentKeys.filter((key) => key !== currentUserKey);
            }

            return {
              ...wish,
              likesCount: json.likesCount ?? wish.likesCount ?? 0,
              likeUserKeys: nextKeys
            };
          })
        };
      });
    } catch (e) {
      setError(e.message || 'Không thể thả tim');
    } finally {
      setLikeLoadingIds((prev) => prev.filter((id) => id !== wishId));
    }
  }

  async function handleGoogleLogin() {
    setAuthMessage('');
    if (!hasFirebaseConfig || !auth || !googleProvider) {
      setAuthMessage('Chưa cấu hình Firebase Auth.');
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
      setAuthMessage('Đăng nhập Google thành công.');
    } catch (e) {
      setAuthMessage(e.message || 'Đăng nhập Google thất bại');
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    setAuthMessage('');
  }

  const value = {
    data,
    loading,
    error,
    user,
    authLoading,
    authMessage,
    wishes,
    participantsCount,
    myWishCount,
    content,
    submitting,
    likeLoadingIds,
    hasFirebaseConfig,
    setContent,
    submitWish,
    likeWish,
    isWishLikedByCurrentUser,
    handleGoogleLogin,
    handleLogout
  };

  return <EventAppContext.Provider value={value}>{children}</EventAppContext.Provider>;
}

export function useEventApp() {
  const context = useContext(EventAppContext);
  if (!context) {
    throw new Error('useEventApp must be used within EventAppProvider');
  }
  return context;
}

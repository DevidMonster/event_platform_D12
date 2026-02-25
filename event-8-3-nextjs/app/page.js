'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import HeroSection from '../components/layout/HeroSection';
import QuickStats from '../components/layout/QuickStats';
import AuthSection from '../components/layout/AuthSection';
import HomeTab from '../components/tabs/HomeTab';
import WishesTab from '../components/tabs/WishesTab';
import GameTab from '../components/tabs/GameTab';
import { auth, googleProvider, hasFirebaseConfig } from '../lib/firebase';
import { eventSlug, luckyPool } from '../lib/event-content';

export default function Event83Page() {
  const [tab, setTab] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState('');
  const [likeLoadingIds, setLikeLoadingIds] = useState([]);

  const wishes = useMemo(() => data?.wishes || [], [data]);
  const participantsCount = useMemo(() => {
    const keys = new Set();
    wishes.forEach((wish) => {
      if (wish.userUid) {
        keys.add(`uid:${wish.userUid}`);
      } else if (wish.userEmail) {
        keys.add(`email:${wish.userEmail}`);
      } else if (wish.authorName) {
        keys.add(`name:${wish.authorName.toLowerCase()}`);
      }
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
    () => String(user?.uid || user?.email || '').trim().toLowerCase(),
    [user]
  );

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

      if (!res.ok) throw new Error('Gửi lời chúc thất bại');

      setContent('');
      await load();
      setTab('wishes');
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

  async function handleEmailAuth(e) {
    e.preventDefault();
    setAuthMessage('');

    if (!hasFirebaseConfig || !auth) {
      setAuthMessage('Chưa cấu hình Firebase Auth.');
      return;
    }

    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthMessage('Tạo tài khoản thành công.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthMessage('Đăng nhập thành công.');
      }
    } catch (e) {
      setAuthMessage(e.message || 'Xác thực thất bại');
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

  function runLuckyDraw() {
    setDrawing(true);
    setDrawResult('Đang bốc thăm...');

    window.setTimeout(() => {
      const random = luckyPool[Math.floor(Math.random() * luckyPool.length)];
      setDrawResult(random);
      setDrawing(false);
    }, 1200);
  }

  if (loading) return <main className="event-shell">Đang tải sự kiện 8/3...</main>;
  if (error && !data) return <main className="event-shell">Lỗi: {error}</main>;
  if (!data) return <main className="event-shell">Không có dữ liệu</main>;

  return (
    <main className="event-shell">
      <div className="floating f1" />
      <div className="floating f2" />
      <div className="floating f3" />
      <div className="bloom bloom1" />
      <div className="bloom bloom2" />
      <div className="bloom bloom3" />
      <div className="bloom bloom4" />

      <HeroSection event={data.event} tab={tab} onTabChange={setTab} />

      <QuickStats
        totalWishes={wishes.length}
        participantsCount={participantsCount}
        myWishCount={myWishCount}
      />

      <AuthSection
        user={user}
        authLoading={authLoading}
        hasFirebaseConfig={hasFirebaseConfig}
        authMode={authMode}
        email={email}
        password={password}
        authMessage={authMessage}
        onSetEmail={setEmail}
        onSetPassword={setPassword}
        onSwitchAuthMode={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
        onEmailAuth={handleEmailAuth}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
      />

      {tab === 'home' && <HomeTab />}
      {tab === 'wishes' && (
        <WishesTab
          user={user}
          content={content}
          submitting={submitting}
          error={error}
          wishes={wishes}
          likeLoadingIds={likeLoadingIds}
          isWishLikedByCurrentUser={isWishLikedByCurrentUser}
          onContentChange={setContent}
          onSubmitWish={submitWish}
          onLikeWish={likeWish}
        />
      )}
      {tab === 'game' && (
        <GameTab drawing={drawing} drawResult={drawResult} onLuckyDraw={runLuckyDraw} />
      )}
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider, hasFirebaseConfig } from '../lib/firebase';

const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG || '8-3-2026';
const letterStyles = ['rose', 'cream', 'sky', 'mint', 'gold', 'lavender'];

const miniGameIdeas = [
  {
    title: 'Đoán ý đồng đội',
    desc: 'Người chơi bốc 1 câu hỏi về sở thích đồng nghiệp nữ và chọn đáp án nhanh trong 20 giây.',
    reward: 'Quà nhỏ hoặc voucher cà phê'
  },
  {
    title: 'Bốc thăm may mắn',
    desc: 'Mỗi tài khoản được quay 1 lần để nhận quà bất ngờ ngay trên trang sự kiện.',
    reward: 'Quà ngẫu nhiên theo cấp độ'
  },
  {
    title: 'Ghép lời chúc',
    desc: 'Sắp xếp các mảnh câu thành 1 lời chúc hoàn chỉnh, tính điểm theo tốc độ.',
    reward: 'Top 3 nhận quà đặc biệt'
  }
];

const luckyPool = [
  'Sticker 8/3',
  'Voucher trà sữa',
  'Sổ tay mini',
  'Gấu bông nhỏ',
  'Son dưỡng',
  'Không trúng thưởng - quay lại sau'
];

const grandWishes = [
  'Chúc toàn thể chị em luôn rạng rỡ, tự tin và thành công trên mọi hành trình.',
  'Chúc một ngày 8/3 ngập tràn niềm vui, tiếng cười và những điều ngọt ngào.',
  'Chúc các bóng hồng D12 thật nhiều sức khỏe, hạnh phúc và thật nhiều yêu thương.',
  'Cảm ơn những đóng góp bền bỉ của chị em, chúc mọi điều tốt đẹp nhất luôn đồng hành.'
];

function hashCode(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
          userEmail: user.email || null
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

      <header className="hero">
        <div className="hero-top">
          <div className="brand-row">
            <Image
              src="/assets/images/D12_logo.png"
              alt="D12 Logo"
              width={56}
              height={56}
              className="brand-logo"
              priority
            />
            <span className="brand-name">D12 Event</span>
          </div>
          <p className="hero-kicker">Sự kiện 8/3</p>
        </div>
        <h1>{data.event.name}</h1>
        <p>{data.event.description || 'Không gian lời chúc và kết nối toàn đơn vị.'}</p>

        <nav className="tabs">
          <button
            className={tab === 'home' ? 'tab active' : 'tab'}
            onClick={() => setTab('home')}
          >
            🏠 Trang chủ
          </button>
          <button
            className={tab === 'wishes' ? 'tab active' : 'tab'}
            onClick={() => setTab('wishes')}
          >
            💌 Gửi lời chúc
          </button>
          <button
            className={tab === 'game' ? 'tab active' : 'tab'}
            onClick={() => setTab('game')}
          >
            🎁 Mini game
          </button>
        </nav>
      </header>

      <section className="quick-stats panel">
        <article className="stat-chip">
          <p className="stat-label">Tổng lời chúc</p>
          <p className="stat-value">{wishes.length}</p>
        </article>
        <article className="stat-chip">
          <p className="stat-label">Người đã gửi</p>
          <p className="stat-value">{participantsCount}</p>
        </article>
        <article className="stat-chip">
          <p className="stat-label">Lời chúc của bạn</p>
          <p className="stat-value">{myWishCount}</p>
        </article>
      </section>

      <section className="panel auth-panel">
        <div>
          <h3>Tài khoản tham gia</h3>
          {!authLoading && user ? (
            <div className="user-chip">
              <p>
                Đang đăng nhập: <strong>{user.displayName || user.email}</strong>
              </p>
              <button className="btn ghost" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              {!hasFirebaseConfig && (
                <p className="message error">Chưa cấu hình Firebase env cho đăng nhập.</p>
              )}
              <form onSubmit={handleEmailAuth} className="auth-form">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Email"
                  required
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Mật khẩu"
                  required
                />
                <div className="inline-btns">
                  <button className="btn" type="submit">
                    {authMode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
                  </button>
                  <button
                    className="btn soft"
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={!hasFirebaseConfig}
                  >
                    Đăng nhập Google
                  </button>
                </div>
              </form>

              <button
                className="switch-mode"
                type="button"
                onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
              >
                {authMode === 'register'
                  ? 'Đã có tài khoản? Đăng nhập'
                  : 'Chưa có tài khoản? Đăng ký'}
              </button>
            </>
          )}
          {authMessage && <p className="message">{authMessage}</p>}
        </div>
      </section>

      {tab === 'home' && (
        <section className="panel fade-in">
          <article className="home-card">
            <h2>✨ Lời chào mừng</h2>
            <p>
              Chào mừng toàn thể anh chị em đến với không gian 8/3. Hãy gửi một lời chúc chân thành,
              đọc các thông điệp đẹp và cùng nhau tạo nên một ngày thật vui.
            </p>
            <p>
              Điểm nhấn năm nay là khu “Lá thư 8/3” với phong cách trang nhã để mọi lời chúc đều được
              hiển thị đẹp mắt. Bạn có thể vào tab <strong>Gửi lời chúc</strong> để tham gia ngay.
            </p>
          </article>

          <div className="wish-banner">
            <p>🌸 Chúc mừng Quốc tế Phụ nữ 8/3 - Tỏa sáng theo cách của bạn 🌸</p>
          </div>

          <div className="grand-wish-grid">
            {grandWishes.map((wish) => (
              <article key={wish} className="grand-wish-card">
                <p className="wish-icon">💖</p>
                <p>{wish}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'wishes' && (
        <section className="panel fade-in">
          <h2>Gửi lời chúc</h2>
          <form onSubmit={submitWish} className="wish-form">
            <textarea
              rows={4}
              placeholder={user ? 'Nhập lời chúc của bạn...' : 'Đăng nhập để gửi lời chúc'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={!user}
            />
            <button className="btn" disabled={submitting || !user}>
              {submitting ? 'Đang gửi...' : 'Gửi lời chúc'}
            </button>
          </form>

          {error && <p className="message error">{error}</p>}

          <div className="letters-grid">
            {wishes.length === 0 && <p>Chưa có lời chúc nào.</p>}
            {wishes.map((wish, index) => {
              const code = hashCode(`${wish._id}-${index}`);
              const style = letterStyles[code % letterStyles.length];
              const tilt = code % 2 === 0 ? 'tilt-left' : 'tilt-right';
              const sentAt = wish.createdAt
                ? new Date(wish.createdAt).toLocaleDateString('vi-VN')
                : '';

              return (
                <article key={wish._id} className={`letter letter-${style} ${tilt}`}>
                  <div className="letter-head">
                    <p className="letter-title">Từ: {wish.authorName}</p>
                    {sentAt && <p className="letter-date">{sentAt}</p>}
                  </div>
                  <p className="letter-content">{wish.content}</p>
                  <div className="letter-stamp">8/3</div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'game' && (
        <section className="panel fade-in">
          <h2>Mini game đề xuất</h2>
          <div className="idea-grid">
            {miniGameIdeas.map((idea) => (
              <article key={idea.title} className="idea-card">
                <h3>{idea.title}</h3>
                <p>{idea.desc}</p>
                <p className="reward">Quà: {idea.reward}</p>
              </article>
            ))}
          </div>

          <article className="draw-box">
            <h3>Chơi thử: Bốc thăm may mắn</h3>
            <p>Mỗi tài khoản nhận 1 phần quà ngẫu nhiên.</p>
            <button className="btn" onClick={runLuckyDraw} disabled={drawing}>
              {drawing ? 'Đang quay...' : 'Bốc thăm ngay'}
            </button>
            {drawResult && <p className="draw-result">Kết quả: {drawResult}</p>}
          </article>
        </section>
      )}
    </main>
  );
}

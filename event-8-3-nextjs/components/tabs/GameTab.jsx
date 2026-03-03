'use client';

import { useEffect, useMemo, useState } from 'react';
import { eventSlug } from '../../lib/event-content';

function normalizePool(pool) {
  if (!Array.isArray(pool)) return [];
  return pool
    .map((item) => ({
      label: String(item?.label || '').trim(),
      quantity: Math.max(0, Number(item?.quantity || 0))
    }))
    .filter((item) => item.label && item.quantity > 0);
}

function expandPoolLabels(pool) {
  const labels = [];
  pool.forEach((item) => {
    for (let i = 0; i < item.quantity; i += 1) {
      labels.push(item.label);
    }
  });
  return labels;
}

function pickTargetIndex(labels, rewardLabel) {
  const candidates = [];
  labels.forEach((label, index) => {
    if (label === rewardLabel) candidates.push(index);
  });

  if (!candidates.length) {
    return Math.floor(Math.random() * labels.length);
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function GameTab({ user }) {
  const [message, setMessage] = useState('');
  const [bootLoading, setBootLoading] = useState(true);
  const [wheelLoading, setWheelLoading] = useState(false);
  const [wheelResult, setWheelResult] = useState('');
  const [wheelRotateDeg, setWheelRotateDeg] = useState(0);
  const [wheelPool, setWheelPool] = useState([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canPlay = Boolean(user?.uid || user?.email);
  const authorName = useMemo(() => user?.displayName || user?.email || 'Guest', [user]);

  const wheelLabels = useMemo(() => expandPoolLabels(wheelPool), [wheelPool]);
  const renderLabels = wheelLabels.length ? wheelLabels : ['Hết giải'];
  const totalRemaining = useMemo(
    () => wheelPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [wheelPool]
  );

  async function loadWheelPool() {
    try {
      setBootLoading(true);
      const res = await fetch(`${apiUrl}/api/public/games/${eventSlug}/bootstrap`, {
        cache: 'no-store'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không tải được kho quay thưởng');
      setWheelPool(normalizePool(json.wheelPool));
    } catch (e) {
      setMessage(e.message || 'Không tải được kho quay thưởng');
    } finally {
      setBootLoading(false);
    }
  }

  useEffect(() => {
    loadWheelPool();
  }, []);

  async function callWheelApi() {
    if (!canPlay) {
      setMessage('Bạn cần đăng nhập Google để tham gia quay thưởng.');
      return null;
    }

    const res = await fetch(`${apiUrl}/api/public/games/${eventSlug}/wheel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user?.uid || null,
        userEmail: user?.email || null,
        authorName
      })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Quay thưởng thất bại');
    return json;
  }

  function animateWheelToReward(rewardLabel) {
    const labels = wheelLabels.length ? wheelLabels : ['Hết giải'];
    const segment = 360 / labels.length;
    const targetIndex = pickTargetIndex(labels, rewardLabel);
    const targetCenter = targetIndex * segment + segment / 2;
    const landingDeg = (360 - targetCenter + 360) % 360;
    const extraTurn = (4 + Math.floor(Math.random() * 4)) * 360;

    setWheelRotateDeg((prev) => prev + extraTurn + landingDeg);
  }

  async function runWheel() {
    if (!wheelLabels.length) {
      setMessage('Đã hết giải. Vui lòng nạp thêm giải thưởng.');
      return;
    }

    try {
      setWheelLoading(true);
      setMessage('');
      setWheelResult('');

      const json = await callWheelApi();
      if (!json) return;

      const rewardLabel = String(json.rewardLabel || '').trim() || 'Đã hết giải quay thưởng';
      animateWheelToReward(rewardLabel);

      setTimeout(() => {
        setWheelResult(rewardLabel);
      }, 2200);

      if (Array.isArray(json.remainingPool)) {
        setWheelPool(normalizePool(json.remainingPool));
      } else {
        await loadWheelPool();
      }
    } catch (e) {
      setMessage(e.message || 'Quay thưởng thất bại');
    } finally {
      setTimeout(() => setWheelLoading(false), 2200);
    }
  }

  async function resetWheelView() {
    setMessage('');
    setWheelResult('');
    setWheelRotateDeg(0);
    await loadWheelPool();
  }

  return (
    <section className="panel fade-in">
      <div className="game-head">
        <div>
          <h2>Quay thưởng 8/3</h2>
          <p className="game-sub">Còn lại {totalRemaining} phần thưởng trong vòng quay.</p>
        </div>
        <button className="btn ghost" onClick={resetWheelView} disabled={bootLoading || wheelLoading}>
          Tải lại kho giải
        </button>
      </div>

      {!canPlay && <p className="message error">Bạn cần đăng nhập để quay thưởng.</p>}
      {message && <p className="message error">{message}</p>}
      {bootLoading && <p className="message">Đang tải dữ liệu vòng quay...</p>}

      <article className="mini-game-card game-stage fade-in game-card-box">
        <div>
          <h3>Vòng quay may mắn</h3>
          <p>Mỗi lần quay trúng giải nào thì giải đó sẽ bị trừ kho ngay lập tức.</p>
          <div className="wheel-stage">
            <div className="wheel-pointer">▼</div>
            <div
              className="wheel-disc"
              style={{ transform: `rotate(${wheelRotateDeg}deg)`, '--wheel-rot': `${wheelRotateDeg}deg` }}
            >
              {renderLabels.map((label, idx) => (
                <span
                  key={`${label}-${idx}`}
                  className="wheel-label"
                  style={{ '--i': idx, '--total': renderLabels.length }}
                >
                  <b>{label}</b>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <button
            className={`btn spin-btn ${wheelLoading ? 'spinning' : ''}`}
            onClick={runWheel}
            disabled={wheelLoading || !canPlay || bootLoading || !wheelLabels.length}
          >
            {wheelLoading ? 'Đang quay...' : 'Quay ngay'}
          </button>
          {wheelResult && <p className="draw-result">Kết quả: {wheelResult}</p>}

          <div className="reward-summary">
            {wheelPool.length === 0 ? (
              <p>Đã hết giải thưởng.</p>
            ) : (
              wheelPool.map((item) => (
                <p key={item.label}>
                  {item.label}: <strong>{item.quantity}</strong>
                </p>
              ))
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

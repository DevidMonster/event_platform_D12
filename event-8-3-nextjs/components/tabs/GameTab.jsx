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

function normalizeRewardStats(stats) {
  if (!Array.isArray(stats)) return [];
  return stats
    .map((item) => ({
      label: String(item?.label || '').trim(),
      count: Math.max(0, Number(item?.count || 0))
    }))
    .filter((item) => item.label && item.count > 0);
}

function normalizeWinners(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      id: String(item?._id || '').trim(),
      authorName: String(item?.authorName || 'Guest').trim() || 'Guest',
      rewardLabel: String(item?.rewardLabel || '').trim(),
      createdAt: item?.createdAt || null
    }))
    .filter((item) => item.id && item.rewardLabel);
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

function buildWheelGradient(totalSegments) {
  const count = Math.max(1, Number(totalSegments) || 1);
  const segment = 360 / count;
  const colors = [];

  for (let i = 0; i < count; i += 1) {
    const start = (i * segment).toFixed(4);
    const end = ((i + 1) * segment).toFixed(4);
    const hue = Math.round((360 * i) / count);
    colors.push(`hsl(${hue} 88% 84%) ${start}deg ${end}deg`);
  }

  return `conic-gradient(from -90deg, ${colors.join(', ')})`;
}

function formatWinnerTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function GameTab({ user }) {
  const [message, setMessage] = useState('');
  const [bootLoading, setBootLoading] = useState(true);
  const [wheelLoading, setWheelLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [wheelResult, setWheelResult] = useState('');
  const [wheelRotateDeg, setWheelRotateDeg] = useState(0);
  const [wheelPool, setWheelPool] = useState([]);
  const [rewardStats, setRewardStats] = useState([]);
  const [recentWinners, setRecentWinners] = useState([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canPlay = Boolean(user?.uid || user?.email);
  const authorName = useMemo(() => user?.displayName || user?.email || 'Guest', [user]);

  const wheelLabels = useMemo(() => expandPoolLabels(wheelPool), [wheelPool]);
  const renderLabels = wheelLabels.length ? wheelLabels : ['Hết giải'];
  const wheelGradient = useMemo(() => buildWheelGradient(renderLabels.length), [renderLabels.length]);
  const totalRemaining = useMemo(
    () => wheelPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [wheelPool]
  );
  const totalWinners = useMemo(
    () => rewardStats.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [rewardStats]
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
      setRewardStats(normalizeRewardStats(json.rewardStats));
      setRecentWinners(normalizeWinners(json.recentWinners));
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

  async function callResetWheelApi() {
    if (!canPlay) {
      setMessage('Bạn cần đăng nhập để reset kho giải thưởng.');
      return null;
    }

    const res = await fetch(`${apiUrl}/api/public/games/${eventSlug}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user?.uid || null,
        userEmail: user?.email || null,
        authorName
      })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không thể reset kho giải thưởng');
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

      if (Array.isArray(json.rewardStats)) {
        setRewardStats(normalizeRewardStats(json.rewardStats));
      }

      if (Array.isArray(json.recentWinners)) {
        setRecentWinners(normalizeWinners(json.recentWinners));
      }
    } catch (e) {
      setMessage(e.message || 'Quay thưởng thất bại');
    } finally {
      setTimeout(() => setWheelLoading(false), 2200);
    }
  }

  async function resetWheelView() {
    try {
      setResetLoading(true);
      setMessage('');
      setWheelResult('');
      setWheelRotateDeg(0);

      const json = await callResetWheelApi();
      if (!json) return;

      setWheelPool(normalizePool(json.wheelPool));
      setRewardStats(normalizeRewardStats(json.rewardStats));
      setRecentWinners(normalizeWinners(json.recentWinners));
    } catch (e) {
      setMessage(e.message || 'Không thể reset kho giải thưởng');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <section className="panel fade-in">
      <div className="game-head">
        <div>
          <h2>Quay thưởng 8/3</h2>
          <p className="game-sub">Còn lại {totalRemaining} phần thưởng trong vòng quay.</p>
        </div>
        <button
          className="btn ghost"
          onClick={resetWheelView}
          disabled={bootLoading || wheelLoading || resetLoading}
        >
          {resetLoading ? 'Đang reset kho...' : 'Tải lại kho giải'}
        </button>
      </div>

      {!canPlay && <p className="message error">Bạn cần đăng nhập để quay thưởng.</p>}
      {message && <p className="message error">{message}</p>}
      {bootLoading && <p className="message">Đang tải dữ liệu vòng quay...</p>}

      <div className="game-container">
        <article className="mini-game-card game-stage fade-in game-card-box">
          <div>
            <h3>Vòng quay may mắn</h3>
            <p>Mỗi lần quay trúng giải nào thì giải đó sẽ bị trừ kho ngay lập tức.</p>
            <div className="wheel-stage">
              <div className="wheel-pointer">▼</div>
              <div
                className="wheel-disc"
                style={{
                  transform: `rotate(${wheelRotateDeg}deg)`,
                  '--wheel-rot': `${wheelRotateDeg}deg`,
                  '--wheel-bg': wheelGradient
                }}
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
              disabled={wheelLoading || resetLoading || !canPlay || bootLoading || !wheelLabels.length}
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

        <aside className="reward-stats-card fade-in">
          <div className="reward-stats-head">
            <h3>Thống kê quay</h3>
            <span className="reward-badge">{totalWinners} lượt trúng</span>
          </div>

          <div className="reward-split">
            <div>
              <p className="reward-panel-title">Giải quay được</p>
              <div className="reward-summary">
                {rewardStats.length === 0 ? (
                  <p className="reward-empty">Chưa có lượt quay trúng.</p>
                ) : (
                  rewardStats.map((item) => (
                    <p key={item.label}>
                      {item.label}: <strong>{item.count}</strong>
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="reward-divider" />

            <div>
              <p className="reward-panel-title">Người nhận gần nhất</p>
              <div className="reward-list">
                {recentWinners.length === 0 ? (
                  <p className="reward-empty">Chưa có người nhận giải.</p>
                ) : (
                  recentWinners.map((item) => (
                    <div className="reward-row" key={item.id}>
                      <div className="reward-rec-head">
                        <p className="reward-label">
                          <span>{item.authorName}</span> nhận {item.rewardLabel}
                        </p>
                        <p className="reward-meta">{formatWinnerTime(item.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

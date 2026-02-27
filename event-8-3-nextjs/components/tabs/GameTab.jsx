'use client';

import { useMemo, useState } from 'react';
import { eventSlug } from '../../lib/event-content';

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

export default function GameTab({ user }) {
  const [activeGame, setActiveGame] = useState('draw');
  const [message, setMessage] = useState('');
  const [rewardStats, setRewardStats] = useState([]);

  const [drawLoading, setDrawLoading] = useState(false);
  const [drawResult, setDrawResult] = useState('');
  const [drawReveal, setDrawReveal] = useState(false);

  const [wheelLoading, setWheelLoading] = useState(false);
  const [wheelResult, setWheelResult] = useState('');
  const [wheelRotateDeg, setWheelRotateDeg] = useState(0);

  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizResult, setQuizResult] = useState('');
  const [quizAnswering, setQuizAnswering] = useState(false);

  const [flipLoading, setFlipLoading] = useState(false);
  const [flipResult, setFlipResult] = useState('');
  const [flipCard, setFlipCard] = useState(null);
  const wheelLabels = ['50K', '30K', '100K', 'Quà', '200K', 'Lucky'];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canPlay = Boolean(user?.uid || user?.email);
  const authorName = useMemo(() => user?.displayName || user?.email || 'Guest', [user]);
  const rewardSummary = useMemo(() => {
    const map = new Map();
    rewardStats.forEach((item) => {
      map.set(item.label, (map.get(item.label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }, [rewardStats]);
  const assignedCount = useMemo(
    () => rewardStats.filter((item) => String(item.recipientName || '').trim()).length,
    [rewardStats]
  );

  function addRewardStat(label, source) {
    const normalized = String(label || '').trim();
    if (!normalized) return;
    setRewardStats((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: normalized,
        source,
        recipientName: ''
      }
    ]);
  }

  function updateRecipient(id, recipientName) {
    setRewardStats((prev) =>
      prev.map((item) => (item.id === id ? { ...item, recipientName } : item))
    );
  }

  async function callGameApi(path, body) {
    if (!canPlay) {
      setMessage('Bạn cần đăng nhập Google để tham gia mini game.');
      return null;
    }
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user?.uid || null,
        userEmail: user?.email || null,
        authorName,
        ...body
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Mini game lỗi');
    return json;
  }

  async function runDraw() {
    try {
      setDrawLoading(true);
      setDrawReveal(false);
      const json = await callGameApi(`/api/public/games/${eventSlug}/draw`, {});
      if (!json) return;
      setTimeout(() => {
        const rewardLabel = json.rewardLabel || '';
        setDrawResult(rewardLabel);
        addRewardStat(rewardLabel, 'Bốc thăm');
        setDrawReveal(true);
      }, 780);
    } catch (e) {
      setMessage(e.message || 'Bốc thăm thất bại');
    } finally {
      setTimeout(() => setDrawLoading(false), 780);
    }
  }

  async function runWheel() {
    try {
      setWheelLoading(true);
      setWheelResult('');
      const nextSpin = 1800 + Math.floor(Math.random() * 1200);
      setWheelRotateDeg((prev) => prev + nextSpin);
      const json = await callGameApi(`/api/public/games/${eventSlug}/wheel`, {});
      if (!json) return;
      setTimeout(() => {
        const rewardLabel = json.rewardLabel || '';
        setWheelResult(rewardLabel);
        addRewardStat(rewardLabel, 'Vòng quay');
      }, 2200);
    } catch (e) {
      setMessage(e.message || 'Quay thưởng thất bại');
    } finally {
      setTimeout(() => setWheelLoading(false), 2200);
    }
  }

  async function loadQuizQuestion() {
    try {
      setQuizLoading(true);
      setQuizResult('');
      const res = await fetch(`${apiUrl}/api/public/games/${eventSlug}/quiz/question`, {
        cache: 'no-store'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không tải được câu hỏi');
      setQuizQuestion(json.question || null);
    } catch (e) {
      setMessage(e.message || 'Không tải được câu hỏi');
    } finally {
      setQuizLoading(false);
    }
  }

  async function answerQuiz(answerIndex) {
    if (!quizQuestion) return;
    try {
      setQuizAnswering(true);
      const json = await callGameApi(`/api/public/games/${eventSlug}/quiz/answer`, {
        questionId: quizQuestion._id,
        answerIndex
      });
      if (!json) return;
      if (json.correct) {
        const rewardLabel = `Tiền thưởng ${formatMoney(json.rewardAmount)}`;
        setQuizResult(`Chính xác. Bạn nhận ${formatMoney(json.rewardAmount)}.`);
        addRewardStat(rewardLabel, 'Giải đố');
      } else {
        setQuizResult('Chưa đúng rồi. Bạn có thể lấy câu khác để thử tiếp.');
      }
    } catch (e) {
      setMessage(e.message || 'Trả lời câu hỏi thất bại');
    } finally {
      setQuizAnswering(false);
    }
  }

  async function pickFlipCard(index) {
    try {
      setFlipLoading(true);
      const json = await callGameApi(`/api/public/games/${eventSlug}/flip`, {
        selectedCard: index
      });
      if (!json) return;
      setFlipCard(index);
      const rewardLabel = json.rewardLabel || '';
      setFlipResult(rewardLabel);
      addRewardStat(rewardLabel, 'Lật thẻ');
    } catch (e) {
      setMessage(e.message || 'Lật thẻ thất bại');
    } finally {
      setFlipLoading(false);
    }
  }

  function resetAll() {
    setDrawResult('');
    setDrawReveal(false);
    setWheelResult('');
    setWheelRotateDeg(0);
    setQuizQuestion(null);
    setQuizResult('');
    setFlipResult('');
    setFlipCard(null);
    setRewardStats([]);
    setMessage('');
  }

  return (
    <section className="panel fade-in">
      <div className="game-head">
        <div>
          <h2>Mini game 8/3</h2>
          <p className="game-sub">Đăng nhập Google để tham gia và nhận quà ngẫu nhiên.</p>
        </div>
        <button className="btn ghost" onClick={resetAll}>
          Reset
        </button>
      </div>

      {!canPlay && <p className="message error">Bạn cần đăng nhập để chơi mini game.</p>}
      {message && <p className="message error">{message}</p>}

      <div className="game-tabs">
        <button
          className={activeGame === 'draw' ? 'game-tab-btn active' : 'game-tab-btn'}
          onClick={() => setActiveGame('draw')}
        >
          Bốc thăm
        </button>
        <button
          className={activeGame === 'wheel' ? 'game-tab-btn active' : 'game-tab-btn'}
          onClick={() => setActiveGame('wheel')}
        >
          Vòng quay
        </button>
        <button
          className={activeGame === 'quiz' ? 'game-tab-btn active' : 'game-tab-btn'}
          onClick={() => setActiveGame('quiz')}
        >
          Giải đố
        </button>
        <button
          className={activeGame === 'flip' ? 'game-tab-btn active' : 'game-tab-btn'}
          onClick={() => setActiveGame('flip')}
        >
          Lật thẻ
        </button>
        <button
          className={activeGame === 'sayword' ? 'game-tab-btn active' : 'game-tab-btn'}
          onClick={() => setActiveGame('sayword')}
        >
          Say The Word
        </button>
      </div>

      <div className='game-container'>
        <div className="game-wrapper">
          {activeGame === 'draw' && (
            <article className="mini-game-card game-stage fade-in game-card-box">
              <div>
                <h3>Bốc thăm quà</h3>
                <p>Nhấn bốc thăm để mở phong thư nhận quà bất kỳ trong kho.</p>
                <div className="draw-envelope-wrap">
                  <div className={drawReveal ? 'draw-envelope reveal' : 'draw-envelope'}>
                    <div className="draw-envelope-front">8/3</div>
                    <div className="draw-envelope-back">{drawResult || 'Phần quà bí mật'}</div>
                  </div>
                </div>
              </div>
              <div>
                <button className="btn" onClick={runDraw} disabled={drawLoading || !canPlay}>
                  {drawLoading ? 'Đang mở thư...' : 'Bốc thăm ngay'}
                </button>
                {drawResult && <p className="draw-result">Kết quả: {drawResult}</p>}
              </div>
            </article>
          )}
          
          {activeGame === 'wheel' && (
            <article className="mini-game-card game-stage fade-in game-card-box">
              <div>
                <h3>Vòng quay may mắn</h3>
                <p>Quay bánh xe để nhận quà ngẫu nhiên.</p>
                <div className="wheel-stage">
                  <div className="wheel-pointer">▼</div>
                  <div
                    className="wheel-disc"
                    style={{ transform: `rotate(${wheelRotateDeg}deg)`, '--wheel-rot': `${wheelRotateDeg}deg` }}
                  >
                    {wheelLabels.map((label, idx) => (
                      <span
                        key={`${label}-${idx}`}
                        className="wheel-label"
                        style={{ '--i': idx, '--total': wheelLabels.length }}
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
                  disabled={wheelLoading || !canPlay}
                >
                  {wheelLoading ? 'Đang quay...' : 'Quay ngay'}
                </button>
                {wheelResult && <p className="draw-result">Kết quả: {wheelResult}</p>}
              </div>
            </article>
          )}
          
          {activeGame === 'quiz' && (
            <article className="mini-game-card game-stage fade-in">
              <h3>Giải đố thưởng tiền</h3>
              <p>Trả lời đúng để nhận tiền thưởng.</p>
              <div className="inline-btns">
                <button className="btn soft" onClick={loadQuizQuestion} disabled={quizLoading || !canPlay}>
                  {quizLoading ? 'Đang lấy câu...' : 'Lấy câu hỏi'}
                </button>
              </div>
              {quizQuestion && (
                <div className="quiz-box">
                  <p className="quiz-prompt">{quizQuestion.prompt}</p>
                  <div className="quiz-options">
                    {quizQuestion.options.map((option, idx) => (
                      <button
                        key={`${quizQuestion._id}-${idx}`}
                        className="btn ghost"
                        onClick={() => answerQuiz(idx)}
                        disabled={quizAnswering || !canPlay}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="quiz-reward">Thưởng tối đa: {formatMoney(quizQuestion.rewardAmount)}</p>
                </div>
              )}
              {quizResult && <p className="draw-result">{quizResult}</p>}
            </article>
          )}
          
          {activeGame === 'flip' && (
            <article className="mini-game-card game-stage fade-in">
              <h3>Lật thẻ bí mật</h3>
              <p>Chọn 1 ô bất kỳ để mở phần quà hoặc lời chúc đặc biệt.</p>
              <div className="flip-grid">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <button
                    key={`card-${idx}`}
                    className={flipCard === idx ? 'flip-card active' : 'flip-card'}
                    onClick={() => pickFlipCard(idx)}
                    disabled={flipLoading || !canPlay}
                  >
                    <span className="flip-card-face front">{idx + 1}</span>
                    <span className="flip-card-face back">🎁</span>
                  </button>
                ))}
              </div>
              {flipResult && <p className="draw-result">Kết quả: {flipResult}</p>}
            </article>
          )}

          {activeGame === 'sayword' && (
            <article className="mini-game-card game-stage fade-in">
              <h3>Say The Word</h3>
              <div className="sayword-container" />
            </article>
          )}
        </div>
        
        <section className="reward-stats-card">
          <div className="reward-stats-head">
            <h3>Thống kê quà/thưởng đã bốc</h3>
          </div>
          {rewardStats.length === 0 ? (
            <p className="reward-empty">Chưa có dữ liệu. Chơi game để ghi nhận phần thưởng.</p>
          ) : (
            <>
              <div className="reward-split">
                <div className="reward-summary-panel">
                  <p className="reward-panel-title">Tổng quan phần thưởng</p>
                  <div className="reward-summary">
                    {rewardSummary.map((item) => (
                      <p key={`sum-${item.label}`}>
                        {item.label}: <strong>{item.count}</strong>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="reward-divider" />

                <div className="reward-recipients-panel">
                  <div className="reward-rec-head">
                    <p className="reward-panel-title">Danh sách người nhận</p>
                    <p className="reward-meta">
                      Đã nhập: <strong>{assignedCount}</strong> | Chưa nhập:{' '}
                      <strong>{rewardStats.length - assignedCount}</strong>
                    </p>
                  </div>

                  <div className="reward-list">
                    {rewardStats.map((item, idx) => (
                      <article key={item.id} className="reward-row">
                        <p className="reward-label">
                          <span>#{idx + 1}</span> {item.label}
                          <em>({item.source})</em>
                        </p>
                        <input
                          value={item.recipientName}
                          onChange={(e) => updateRecipient(item.id, e.target.value)}
                          placeholder="Nhập tên người nhận"
                        />
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

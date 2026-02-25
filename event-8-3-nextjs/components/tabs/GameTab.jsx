import { miniGameIdeas } from '../../lib/event-content';

export default function GameTab({ drawing, drawResult, onLuckyDraw }) {
  return (
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
        <button className="btn" onClick={onLuckyDraw} disabled={drawing}>
          {drawing ? 'Đang quay...' : 'Bốc thăm ngay'}
        </button>
        {drawResult && <p className="draw-result">Kết quả: {drawResult}</p>}
      </article>
    </section>
  );
}

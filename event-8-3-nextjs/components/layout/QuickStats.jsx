export default function QuickStats({ totalWishes, participantsCount, myWishCount }) {
  return (
    <section className="quick-stats panel">
      <article className="stat-chip">
        <p className="stat-label">Tổng lời chúc</p>
        <p className="stat-value">{totalWishes}</p>
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
  );
}

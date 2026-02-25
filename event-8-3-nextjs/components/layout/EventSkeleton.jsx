export default function EventSkeleton() {
  return (
    <main className="event-shell">
      <section className="hero skeleton-card">
        <div className="skeleton skeleton-line w-30" />
        <div className="skeleton skeleton-line w-60" />
        <div className="skeleton skeleton-line w-45" />
        <div className="skeleton-row">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-pill" />
        </div>
      </section>

      <section className="quick-stats panel skeleton-card">
        <div className="skeleton skeleton-box" />
        <div className="skeleton skeleton-box" />
        <div className="skeleton skeleton-box" />
      </section>

      <section className="panel skeleton-card">
        <div className="skeleton skeleton-line w-35" />
        <div className="skeleton skeleton-line w-80" />
        <div className="skeleton skeleton-line w-70" />
      </section>
    </main>
  );
}

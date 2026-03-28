'use client';

import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import { useGreetingApp } from '../../context/GreetingAppContext';

function SideSummary() {
  const { myReceivedCards, inboxCards } = useGreetingApp();

  return (
    <section className="side-card">
      <p className="side-kicker">Tổng quan</p>
      <h3>{myReceivedCards.length} thiệp gửi đến bạn</h3>
      <p>{inboxCards.length} thiệp đang hiển thị trên bảng tin Boy&apos;s Day.</p>
    </section>
  );
}

export default function InboxPage() {
  const { myReceivedCards, inboxCards } = useGreetingApp();

  return (
    <AppShell
      title="D12 - Boy's Day 6/4"
      subtitle="Nhận và xem lại những lời chúc gửi trong ngày Boy's Day"
      sidePanel={<SideSummary />}
    >
      <AuthGate>
        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Dành cho bạn</p>
              <h2>Thiệp gửi đến mình</h2>
            </div>
          </div>
          <div className="cards-grid featured">
            {myReceivedCards.length ? (
              myReceivedCards.map((card) => <GreetingCardPreview key={card.id} card={card} hideSender />)
            ) : (
              <article className="empty-card">
                <h3>Chưa có thiệp mới</h3>
                <p>Khi có ai đó gửi thiệp Boy&apos;s Day cho bạn, mục này sẽ hiển thị ngay.</p>
              </article>
            )}
          </div>
        </section>

        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Bảng tin</p>
              <h2>Tất cả thiệp đã gửi</h2>
            </div>
          </div>
          <div className="cards-grid">
            {inboxCards.map((card) => (
              <GreetingCardPreview key={card.id} card={card} hideSender />
            ))}
          </div>
        </section>
      </AuthGate>
    </AppShell>
  );
}

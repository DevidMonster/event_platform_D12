'use client';

import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import { useGreetingApp } from '../../context/GreetingAppContext';

function SideSent() {
  const { mySentCards } = useGreetingApp();

  return (
    <section className="side-card">
      <p className="side-kicker">Đã gửi</p>
      <h3>{mySentCards.length} thiệp do bạn tạo</h3>
      <p>Theo dõi nhanh trạng thái của các thiệp bạn đã gửi.</p>
    </section>
  );
}

export default function SentPage() {
  const { mySentCards } = useGreetingApp();

  return (
    <AppShell title="DGC - D12 Greeting Cards" subtitle="Gửi thiệp đến những người bạn" sidePanel={<SideSent />}>
      <AuthGate>
        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Lịch sử</p>
              <h2>Tất cả thiệp đã gửi</h2>
            </div>
          </div>
          <div className="cards-grid">
            {mySentCards.length ? (
              mySentCards.map((card) => <GreetingCardPreview key={card.id} card={card} hideSender={false} />)
            ) : (
              <article className="empty-card">
                <h3>Chưa có thiệp nào</h3>
                <p>Chọn một mẫu ở màn Gửi thiệp để bắt đầu.</p>
              </article>
            )}
          </div>
        </section>
      </AuthGate>
    </AppShell>
  );
}

'use client';

import { useState } from 'react';
import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import CardDetailModal from '../modals/CardDetailModal';
import { CardsGridSkeleton, SideCardSkeleton } from '../layout/DataSkeletons';
import { useGreetingApp } from '../../context/GreetingAppContext';

function SideSent() {
  const { mySentCards, cardsLoading } = useGreetingApp();

  if (cardsLoading) {
    return <SideCardSkeleton />;
  }

  return (
    <section className="side-card">
      <p className="side-kicker">Đã gửi</p>
      <h3>{mySentCards.length} thiệp do bạn tạo</h3>
      <p>Theo dõi nhanh trạng thái các thiệp Boy&apos;s Day bạn đã gửi.</p>
    </section>
  );
}

export default function SentPage() {
  const { mySentCards, cardsLoading, cardsMessage } = useGreetingApp();
  const [selectedCard, setSelectedCard] = useState(null);

  return (
    <AppShell
      title="D12 - Boy&apos;s Day 6/4"
      subtitle="Theo dõi những tấm thiệp bạn đã gửi trong ngày 6/4"
      sidePanel={<SideSent />}
    >
      <AuthGate>
        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Lịch sử</p>
              <h2>Tất cả thiệp đã gửi</h2>
            </div>
          </div>

          {cardsMessage && !cardsLoading ? <p className="composer-ai-status">{cardsMessage}</p> : null}

          {cardsLoading ? (
            <CardsGridSkeleton />
          ) : (
            <div className="cards-grid cards-grid-mobile-2">
              {mySentCards.length ? (
                mySentCards.map((card) => (
                  <GreetingCardPreview key={card.id} card={card} hideSender={false} onClick={() => setSelectedCard(card)} />
                ))
              ) : (
                <article className="empty-card">
                  <h3>Chưa có thiệp nào</h3>
                  <p>Chọn một mẫu ở màn Gửi thiệp để bắt đầu gửi lời chúc Boy&apos;s Day.</p>
                </article>
              )}
            </div>
          )}
        </section>

        <CardDetailModal
          open={Boolean(selectedCard)}
          card={selectedCard}
          hideSender={false}
          onClose={() => setSelectedCard(null)}
        />
      </AuthGate>
    </AppShell>
  );
}

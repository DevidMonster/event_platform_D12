'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import CardDetailModal from '../modals/CardDetailModal';
import { useGreetingApp } from '../../context/GreetingAppContext';
import defaultLogo from '../../images/default-logo.jpg';
import { buildRecipientGroups, buildRecipientHref } from '../../lib/recipient-groups';

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

function RecipientRow({ group, onOpenCard }) {
  const trackRef = useRef(null);
  const cardCount = group.cards.length;

  function scrollCards(direction) {
    if (!trackRef.current) return;
    const amount = Math.max(trackRef.current.clientWidth * 0.92, 320);
    trackRef.current.scrollBy({
      left: direction * amount,
      behavior: 'smooth'
    });
  }

  return (
    <article className="recipient-row">
      <div className="recipient-row-head">
        <Tooltip title="Ấn vào để xem danh sách" mouseEnterDelay={0} placement="top">
          <Link href={buildRecipientHref(group)} className="recipient-row-meta recipient-row-link">
            <div className="recipient-row-avatar">
              <img
                src={group.avatarUrl || defaultLogo.src}
                alt={group.recipientName}
                onError={(event) => {
                  event.currentTarget.src = defaultLogo.src;
                }}
              />
            </div>
            <div className="recipient-row-copy">
              <h3>{group.recipientName}</h3>
              <p>{group.recipientEmail || `${cardCount} thiệp dành cho người nhận này`}</p>
            </div>
          </Link>
        </Tooltip>

        <div className="recipient-row-actions">
          <span>{cardCount} thiệp</span>
          <Link href={buildRecipientHref(group)} className="recipient-view-link">
            Xem riêng
          </Link>
          <button
            type="button"
            className="recipient-scroll-btn"
            onClick={() => scrollCards(-1)}
            disabled={cardCount <= 1}
          >
            ‹
          </button>
          <button
            type="button"
            className="recipient-scroll-btn"
            onClick={() => scrollCards(1)}
            disabled={cardCount <= 1}
          >
            ›
          </button>
        </div>
      </div>

      <div ref={trackRef} className="recipient-scroll-track">
        {group.cards.map((card) => (
          <div key={card.id} className="recipient-scroll-card">
            <GreetingCardPreview card={card} hideSender compact onClick={() => onOpenCard(card)} />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function InboxPage() {
  const { inboxCards, recipientOptions, user } = useGreetingApp();
  const [selectedCard, setSelectedCard] = useState(null);

  const recipientGroups = useMemo(
    () => buildRecipientGroups(inboxCards, recipientOptions, user),
    [inboxCards, recipientOptions, user]
  );

  return (
    <AppShell
      title="D12 - Boy&apos;s Day 6/4"
      subtitle="Nhận và xem lại những lời chúc gửi trong ngày Boy&apos;s Day"
      sidePanel={<SideSummary />}
    >
      <AuthGate>
        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Bảng tin theo người nhận</p>
              <h2>Danh sách thiệp gửi</h2>
              <p>(ấn vào từng người nhận để xem danh sách thiệp của họ, hoặc từng thiệp để xem chi tiết)</p>
            </div>
          </div>

          <div className="recipient-rows">
            {recipientGroups.length ? (
              recipientGroups.map((group) => (
                <RecipientRow key={group.key} group={group} onOpenCard={setSelectedCard} />
              ))
            ) : (
              <article className="empty-card">
                <h3>Chưa có thiệp mới</h3>
                <p>Khi có ai đó gửi thiệp Boy&apos;s Day, danh sách theo người nhận sẽ xuất hiện tại đây.</p>
              </article>
            )}
          </div>
        </section>

        <CardDetailModal
          open={Boolean(selectedCard)}
          card={selectedCard}
          hideSender
          onClose={() => setSelectedCard(null)}
        />
      </AuthGate>
    </AppShell>
  );
}

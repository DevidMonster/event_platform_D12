'use client';

import { useMemo, useRef } from 'react';
import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import { useGreetingApp } from '../../context/GreetingAppContext';
import defaultLogo from '../../images/default-logo.jpg';

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

function buildRecipientGroups(cards, recipientOptions, user) {
  const profileMap = new Map();

  recipientOptions.forEach((person) => {
    const key = String(person.userEmail || '').trim().toLowerCase();
    if (!key) return;
    profileMap.set(key, person);
  });

  const grouped = new Map();

  cards.forEach((card) => {
    const email = String(card.recipientEmail || '').trim().toLowerCase();
    const name = String(card.recipientName || '').trim() || 'Người nhận';
    const key = email || `${name.toLowerCase()}-${card.id}`;
    const profile =
      (email && profileMap.get(email)) ||
      (email && email === String(user?.email || '').trim().toLowerCase()
        ? {
            authorName: user?.displayName || name,
            userEmail: email,
            avatarUrl: user?.photoURL || null
          }
        : null);

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        recipientName: profile?.authorName || name,
        recipientEmail: email || null,
        avatarUrl: profile?.avatarUrl || null,
        cards: []
      });
    }

    grouped.get(key).cards.push(card);
  });

  return Array.from(grouped.values()).sort((left, right) => {
    const leftDate = new Date(left.cards[0]?.createdAt || 0).getTime();
    const rightDate = new Date(right.cards[0]?.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

function RecipientRow({ group }) {
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
        <div className="recipient-row-meta">
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
        </div>

        <div className="recipient-row-actions">
          <span>{cardCount} thiệp</span>
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
            <GreetingCardPreview card={card} hideSender compact />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function InboxPage() {
  const { inboxCards, recipientOptions, user } = useGreetingApp();

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
              <h2>Mỗi người nhận, một hàng thiệp riêng</h2>
            </div>
          </div>

          <div className="recipient-rows">
            {recipientGroups.length ? (
              recipientGroups.map((group) => <RecipientRow key={group.key} group={group} />)
            ) : (
              <article className="empty-card">
                <h3>Chưa có thiệp mới</h3>
                <p>Khi có ai đó gửi thiệp Boy&apos;s Day, danh sách theo người nhận sẽ xuất hiện tại đây.</p>
              </article>
            )}
          </div>
        </section>
      </AuthGate>
    </AppShell>
  );
}

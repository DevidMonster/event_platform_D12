'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import CardDetailModal from '../modals/CardDetailModal';
import { useGreetingApp } from '../../context/GreetingAppContext';
import { buildRecipientGroups } from '../../lib/recipient-groups';

function SideRecipient({ group }) {
  return (
    <section className="side-card">
      <p className="side-kicker">Người nhận</p>
      <h3>{group?.recipientName || 'Không tìm thấy'}</h3>
      <p>{group?.recipientEmail || 'Nhóm thiệp riêng của người nhận này.'}</p>
    </section>
  );
}

export default function RecipientDetailPage({ recipientKey }) {
  const { inboxCards, recipientOptions, user } = useGreetingApp();
  const [selectedCard, setSelectedCard] = useState(null);

  const recipientGroups = useMemo(
    () => buildRecipientGroups(inboxCards, recipientOptions, user),
    [inboxCards, recipientOptions, user]
  );

  const decodedKey = decodeURIComponent(String(recipientKey || '').trim());
  const group = recipientGroups.find((item) => item.key === decodedKey);

  return (
    <AppShell
      title={group ? group.recipientName : 'Người nhận'}
      subtitle="Xem toàn bộ các thiệp đã nhận của người này"
      sidePanel={<SideRecipient group={group} />}
    >
      <AuthGate>
        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Thiệp đã nhận</p>
              <h2>{group ? `${group.cards.length} thiệp dành cho ${group.recipientName}` : 'Không tìm thấy người nhận'}</h2>
            </div>
            <Link href="/" className="btn btn-ghost">
              Quay lại bảng tin
            </Link>
          </div>

          {group ? (
            <div className="cards-grid">
              {group.cards.map((card) => (
                <GreetingCardPreview key={card.id} card={card} hideSender onClick={() => setSelectedCard(card)} />
              ))}
            </div>
          ) : (
            <article className="empty-card">
              <h3>Không tìm thấy người nhận</h3>
              <p>Danh sách thiệp có thể đã thay đổi hoặc đường dẫn này không còn hợp lệ.</p>
            </article>
          )}
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

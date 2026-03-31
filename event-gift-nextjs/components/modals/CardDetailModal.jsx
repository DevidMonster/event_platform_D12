'use client';

import GreetingCardPreview from '../cards/GreetingCardPreview';

export default function CardDetailModal({ card, open, onClose, hideSender = true }) {
  if (!open || !card) return null;

  return (
    <div className="composer-backdrop" onClick={onClose}>
      <section className="composer-modal detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="composer-head">
          <div>
            <p className="composer-kicker">Chi tiết thiệp</p>
            <h2>{card.recipientName}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            x
          </button>
        </div>

        <div className="detail-modal-body">
          <div className="detail-modal-preview">
            <GreetingCardPreview card={card} hideSender={hideSender} />
          </div>

          <div className="detail-modal-info">
            <div className="draft-note">
              <p className="composer-note">Người nhận</p>
              <strong>{card.recipientName}</strong>
              {card.recipientEmail ? <p className="detail-modal-meta">{card.recipientEmail}</p> : null}
            </div>

            <div className="draft-note">
              <p className="composer-note">Nội dung</p>
              <p className="detail-modal-message">{card.message}</p>
            </div>

            <div className="detail-modal-grid">
              <div className="draft-note">
                <p className="composer-note">Ngày gửi</p>
                <strong>{new Date(card.createdAt).toLocaleString('vi-VN')}</strong>
              </div>

              <div className="draft-note">
                <p className="composer-note">Trạng thái mail</p>
                <strong>{card.mailStatus === 'sent' ? 'Đã gửi mail' : card.mailStatus || 'Chưa rõ'}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

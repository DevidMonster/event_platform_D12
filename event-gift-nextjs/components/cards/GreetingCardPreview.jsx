'use client';

import { Tooltip } from 'antd';
import { cardTemplates } from '../../lib/card-templates';
import { AI_CARD_IMAGE_SPEC } from '../../lib/ai-card-script';

export default function GreetingCardPreview({
  card,
  compact = false,
  hideSender = true,
  overlayAction = null,
  onClick = null
}) {
  const baseTemplate = cardTemplates.find((item) => item.id === card.templateId) || cardTemplates[0];
  const template = {
    ...baseTemplate,
    imageUrl: card.imageUrl || baseTemplate.imageUrl,
    accent: card.templateAccent || baseTemplate.accent,
    surface: card.templateSurface || baseTemplate.surface
  };

  const cardBody = (
    <article
      className={compact ? 'gift-card compact' : 'gift-card'}
      onClick={onClick || undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div
        className={onClick ? 'gift-card-art clickable' : 'gift-card-art'}
        style={{
          '--gift-accent': template.accent,
          '--gift-surface': template.surface,
          aspectRatio: `${AI_CARD_IMAGE_SPEC.width} / ${AI_CARD_IMAGE_SPEC.height}`,
          backgroundImage: `linear-gradient(180deg, rgba(17, 12, 26, 0.08), rgba(17, 12, 26, 0.48)), url(${template.imageUrl})`
        }}
      >
        <div className="gift-card-copy">
          <p className="gift-card-recipient">Gửi đến {card.recipientName}</p>
          <p className="gift-card-message">{card.message}</p>
        </div>
        <div className="gift-card-footer">
          <span>{new Date(card.createdAt).toLocaleDateString('vi-VN')}</span>
          {!hideSender && card.mailStatus ? <span>{card.mailStatus === 'sent' ? 'Đã gửi mail' : card.mailStatus}</span> : null}
        </div>
      </div>
      {overlayAction ? <div className="gift-card-action">{overlayAction}</div> : null}
    </article>
  );

  if (!onClick) {
    return cardBody;
  }

  return (
    <Tooltip title="Ấn vào để xem chi tiết" mouseEnterDelay={0} placement="top">
      {cardBody}
    </Tooltip>
  );
}

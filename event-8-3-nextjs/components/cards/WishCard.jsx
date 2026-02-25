import { useState } from 'react';
import { getInitials, getLetterSizeClass, hashCode } from '../../lib/event-helpers';

function WishAvatar({ authorName, avatarUrl }) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageError;

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt={authorName}
        className="wish-avatar-img"
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
      />
    );
  }

  return <div className="wish-avatar-fallback">{getInitials(authorName)}</div>;
}

export default function WishCard({ wish, index, liked, likeBusy, user, onLike }) {
  const code = hashCode(`${wish._id}-${index}`);
  const styleOptions = ['rose', 'cream', 'sky', 'mint', 'gold', 'lavender'];
  const style = styleOptions[code % styleOptions.length];
  const tilt = code % 2 === 0 ? 'tilt-left' : 'tilt-right';
  const sizeClass = getLetterSizeClass(wish.content, code);
  const sentAt = wish.createdAt ? new Date(wish.createdAt).toLocaleDateString('vi-VN') : '';
  const likesCount = wish.likesCount || 0;

  return (
    <article className={`letter letter-${style} ${tilt} ${sizeClass}`}>
      <div className="letter-head">
        <div className="letter-author">
          <WishAvatar authorName={wish.authorName} avatarUrl={wish.avatarUrl} />
          <p className="letter-title">Từ: {wish.authorName}</p>
        </div>
        {sentAt && <p className="letter-date">{sentAt}</p>}
      </div>

      <p className="letter-content">{wish.content}</p>

      <button
        type="button"
        className={liked ? 'like-btn liked' : 'like-btn'}
        onClick={() => onLike(wish._id)}
        disabled={!user || likeBusy}
        title={!user ? 'Đăng nhập để thả tim' : liked ? 'Bấm để huỷ tim' : 'Thả tim'}
      >
        <span>{liked ? '❤️' : '🤍'}</span>
        <span>{likesCount}</span>
      </button>

      <div className="letter-stamp">8/3</div>
    </article>
  );
}

import { useMemo, useState } from 'react';
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

function buildLikerList(wish) {
  const profileList = Array.isArray(wish?.likeUserProfiles) ? wish.likeUserProfiles : [];
  if (profileList.length > 0) {
    const seen = new Set();
    return profileList
      .map((item) => ({
        userEmail: String(item?.userEmail || '')
          .trim()
          .toLowerCase(),
        userName: String(item?.userName || '').trim() || 'Guest'
      }))
      .filter((item) => item.userEmail)
      .filter((item) => {
        if (seen.has(item.userEmail)) return false;
        seen.add(item.userEmail);
        return true;
      });
  }

  const keys = Array.isArray(wish?.likeUserKeys) ? wish.likeUserKeys : [];
  return keys
    .map((key) => String(key || '').trim().toLowerCase())
    .filter((key) => key.includes('@'))
    .map((email) => ({ userEmail: email, userName: 'Guest' }));
}

export default function WishCard({ wish, index, liked, likeBusy, user, onLike }) {
  const [showLikers, setShowLikers] = useState(false);
  const code = hashCode(`${wish._id}-${index}`);
  const styleOptions = ['rose', 'cream', 'sky', 'mint', 'gold', 'lavender'];
  const style = styleOptions[code % styleOptions.length];
  const tilt = code % 2 === 0 ? 'tilt-left' : 'tilt-right';
  const sizeClass = getLetterSizeClass(wish.content, code);
  const sentAt = wish.createdAt ? new Date(wish.createdAt).toLocaleDateString('vi-VN') : '';
  const likesCount = wish.likesCount || 0;
  const likerList = useMemo(() => buildLikerList(wish), [wish]);

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

      <div className="letter-actions">
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

        <button
          type="button"
          className={`like-list-toggle ${showLikers ? 'active' : ''}`}
          onClick={() => setShowLikers((prev) => !prev)}
          title="Xem người đã thả tim"
          aria-expanded={showLikers}
        >
          <span>📒</span>
          <span className="like-list-caret">{showLikers ? '▲' : '▼'}</span>
        </button>
      </div>

      {showLikers && (
        <div className="like-list-popover">
          <p className="like-list-title">Đã tim ({likesCount})</p>
          {likerList.length === 0 ? (
            <p className="like-list-empty">Chưa có lượt tim.</p>
          ) : (
            <div className="like-list-items">
              {likerList.map((liker) => (
                <p key={`${wish._id}-${liker.userEmail}`} className="like-list-row">
                  <strong>{liker.userName}</strong>
                  <span>{liker.userEmail}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="letter-stamp">8/3</div>
    </article>
  );
}

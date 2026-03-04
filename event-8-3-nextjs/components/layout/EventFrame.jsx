import HeroSection from './HeroSection';
import QuickStats from './QuickStats';
import AuthSection from './AuthSection';
import ChatWidget from './ChatWidget';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function pickTopLikedWish(wishes = []) {
  if (!Array.isArray(wishes) || !wishes.length) return null;

  return wishes.reduce((best, current) => {
    if (!best) return current;

    const bestLikes = Number(best.likesCount || 0);
    const currentLikes = Number(current.likesCount || 0);
    if (currentLikes > bestLikes) return current;
    if (currentLikes < bestLikes) return best;

    const bestTime = new Date(best.createdAt || 0).getTime() || 0;
    const currentTime = new Date(current.createdAt || 0).getTime() || 0;
    return currentTime > bestTime ? current : best;
  }, null);
}

export default function EventFrame({
  event,
  activeTab,
  wishes,
  participantsCount,
  myWishCount,
  user,
  authLoading,
  hasFirebaseConfig,
  authMessage,
  onGoogleLogin,
  onLogout,
  children
}) {
  const topLikedWish = pickTopLikedWish(wishes);
  const topLikedName = String(topLikedWish?.authorName || 'Ẩn danh').trim() || 'Ẩn danh';
  const topLikedAvatar = String(topLikedWish?.avatarUrl || '').trim();
  const topLikedCount = Math.max(0, Number(topLikedWish?.likesCount || 0));

  return (
    <main className="event-shell">
      <div className="floating f1" />
      <div className="floating f2" />
      <div className="floating f3" />
      <div className="bloom bloom1" />
      <div className="bloom bloom2" />
      <div className="bloom bloom3" />
      <div className="bloom bloom4" />

      <HeroSection event={event} tab={activeTab} />

      <QuickStats
        totalWishes={wishes.length}
        participantsCount={participantsCount}
        myWishCount={myWishCount}
      />

      <article className="home-card top-liked-wrap">
        <h3>🏆 Bài viết được yêu thích nhất hiện tại</h3>
        {!topLikedWish ? (
          <p>Chưa có lời nhắn nào. Hãy tham gia gửi lời chúc để bắt đầu bảng xếp hạng!</p>
        ) : (
          <div className="top-liked-card">
            {topLikedAvatar ? (
              <img src={topLikedAvatar} alt={topLikedName} className="top-liked-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="top-liked-avatar fallback">{getInitials(topLikedName)}</div>
            )}
            <div className="top-liked-info">
              <p className="top-liked-name">{topLikedName}</p>
              <p className="top-liked-meta">
                Bài viết đang có <strong>{topLikedCount}</strong> lượt tim.
              </p>
            </div>
          </div>
        )}
      </article>

      {topLikedWish && (
        <aside className="top-liked-sticky" aria-live="polite">
          <div className="top-liked-sticky-inner">
            {topLikedAvatar ? (
              <img
                src={topLikedAvatar}
                alt={topLikedName}
                className="top-liked-sticky-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="top-liked-sticky-avatar fallback">{getInitials(topLikedName)}</div>
            )}
            <div className="top-liked-sticky-info">
              <p className="top-liked-sticky-title">Top tim hiện tại</p>
              <p className="top-liked-sticky-text">
                {topLikedName} • <strong>{topLikedCount}</strong> ❤️
              </p>
            </div>
          </div>
        </aside>
      )}

      <AuthSection
        user={user}
        authLoading={authLoading}
        hasFirebaseConfig={hasFirebaseConfig}
        authMessage={authMessage}
        onGoogleLogin={onGoogleLogin}
        onLogout={onLogout}
      />

      {children}
      <ChatWidget eventSlug={event.slug} user={user} />
    </main>
  );
}

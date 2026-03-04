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

function toSafeLikeCount(item) {
  return Math.max(0, Number(item?.likesCount || 0));
}

function toPriorityTime(item) {
  const updated = new Date(item?.updatedAt || 0).getTime() || 0;
  const created = new Date(item?.createdAt || 0).getTime() || 0;
  return Math.max(updated, created);
}

function sortByTopTieRule(a, b) {
  const likesA = toSafeLikeCount(a);
  const likesB = toSafeLikeCount(b);
  if (likesB !== likesA) return likesB - likesA;
  return toPriorityTime(b) - toPriorityTime(a);
}

function getTopLikedSummary(wishes = []) {
  if (!Array.isArray(wishes) || wishes.length === 0) {
    return { leader: null, tiedOthers: [], topLikes: 0, totalTied: 0 };
  }

  const positiveWishes = wishes.filter((item) => toSafeLikeCount(item) > 0);
  if (positiveWishes.length === 0) {
    return { leader: null, tiedOthers: [], topLikes: 0, totalTied: 0 };
  }

  const ranked = [...positiveWishes].sort(sortByTopTieRule);
  const topLikes = toSafeLikeCount(ranked[0]);
  const tiedGroup = ranked.filter((item) => toSafeLikeCount(item) === topLikes);
  const [leader, ...tiedOthers] = tiedGroup;

  return {
    leader: leader || null,
    tiedOthers,
    topLikes,
    totalTied: tiedGroup.length
  };
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
  const { leader: topLikedWish, tiedOthers, topLikes, totalTied } = getTopLikedSummary(wishes);

  const topLikedName = String(topLikedWish?.authorName || 'Ẩn danh').trim() || 'Ẩn danh';
  const topLikedAvatar = String(topLikedWish?.avatarUrl || '').trim();
  const hasTie = totalTied > 1;

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
          <p>Chưa có lời chúc được yêu thích nhất.</p>
        ) : (
          <>
            <div className="top-liked-card">
              {topLikedAvatar ? (
                <img src={topLikedAvatar} alt={topLikedName} className="top-liked-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="top-liked-avatar fallback">{getInitials(topLikedName)}</div>
              )}
              <div className="top-liked-info">
                <p className="top-liked-name">{topLikedName}</p>
                <p className="top-liked-meta">
                  Bài viết đang có <strong>{topLikes}</strong> lượt tim.
                </p>
                {hasTie && (
                  <p className="top-liked-tie-meta">
                    Có <strong>{totalTied}</strong> người đang đồng hạng {topLikes} lượt tim.
                  </p>
                )}
              </div>
            </div>

            {hasTie && tiedOthers.length > 0 && (
              <details className="top-liked-tie-box">
                <summary className="top-liked-tie-summary">Xem thêm người đồng hạng</summary>
                <div className="top-liked-tie-list">
                  {tiedOthers.map((item) => {
                    const name = String(item?.authorName || 'Ẩn danh').trim() || 'Ẩn danh';
                    const avatar = String(item?.avatarUrl || '').trim();
                    const key = String(item?._id || `${name}-${toPriorityTime(item)}`);

                    return (
                      <div className="top-liked-tie-row" key={key}>
                        {avatar ? (
                          <img src={avatar} alt={name} className="top-liked-tie-avatar" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="top-liked-tie-avatar fallback">{getInitials(name)}</div>
                        )}
                        <div className="top-liked-tie-info">
                          <p>{name}</p>
                          <span>{topLikes} lượt tim</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </>
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
                {topLikedName} • <strong>{topLikes}</strong> ❤️
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

import WishCard from '../cards/WishCard';

export default function WishesTab({
  user,
  content,
  submitting,
  error,
  wishes,
  likeLoadingIds,
  isWishLikedByCurrentUser,
  onContentChange,
  onSubmitWish,
  onLikeWish
}) {
  return (
    <section className="panel fade-in">
      <h2>Gửi lời chúc</h2>
      <form onSubmit={onSubmitWish} className="wish-form">
        <textarea
          rows={4}
          placeholder={user ? 'Nhập lời chúc của bạn...' : 'Đăng nhập để gửi lời chúc'}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          required
          disabled={!user}
        />
        <button className="btn" disabled={submitting || !user}>
          {submitting ? 'Đang gửi...' : 'Gửi lời chúc'}
        </button>
      </form>

      {error && <p className="message error">{error}</p>}

      <div className="letters-grid">
        {wishes.length === 0 && <p>Chưa có lời chúc nào.</p>}
        {wishes.map((wish, index) => (
          <WishCard
            key={wish._id}
            wish={wish}
            index={index}
            liked={isWishLikedByCurrentUser(wish)}
            likeBusy={likeLoadingIds.includes(wish._id)}
            user={user}
            onLike={onLikeWish}
          />
        ))}
      </div>
    </section>
  );
}

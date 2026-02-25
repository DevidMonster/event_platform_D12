'use client';

import WishesTab from '../../tabs/WishesTab';
import { useEventApp } from '../../../context/EventAppContext';

export default function WishesRouteScreen() {
  const {
    user,
    content,
    submitting,
    error,
    wishes,
    likeLoadingIds,
    isWishLikedByCurrentUser,
    setContent,
    submitWish,
    likeWish
  } = useEventApp();

  return (
    <WishesTab
      user={user}
      content={content}
      submitting={submitting}
      error={error}
      wishes={wishes}
      likeLoadingIds={likeLoadingIds}
      isWishLikedByCurrentUser={isWishLikedByCurrentUser}
      onContentChange={setContent}
      onSubmitWish={submitWish}
      onLikeWish={likeWish}
    />
  );
}

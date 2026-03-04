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
  const canViewLikerList =
    String(user?.email || '')
      .trim()
      .toLowerCase() === 'nguyenquangdang310803@gmail.com';

  return (
    <WishesTab
      user={user}
      content={content}
      submitting={submitting}
      error={error}
      wishes={wishes}
      likeLoadingIds={likeLoadingIds}
      isWishLikedByCurrentUser={isWishLikedByCurrentUser}
      canViewLikerList={canViewLikerList}
      onContentChange={setContent}
      onSubmitWish={submitWish}
      onLikeWish={likeWish}
    />
  );
}

'use client';

import { usePathname } from 'next/navigation';
import EventFrame from './EventFrame';
import EventSkeleton from './EventSkeleton';
import { EventAppProvider, useEventApp } from '../../context/EventAppContext';

function resolveActiveTab(pathname) {
  const map = {
    '/': 'wishes',
    '/wishes': 'home',
    '/game': 'game'
  };
  return map[pathname] || 'wishes';
}

function EventAppLayoutInner({ children }) {
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);
  const {
    data,
    loading,
    error,
    user,
    authLoading,
    authMessage,
    wishes,
    participantsCount,
    myWishCount,
    hasFirebaseConfig,
    handleGoogleLogin,
    handleLogout
  } = useEventApp();

  if (loading) return <EventSkeleton />;
  if (error && !data) return <main className="event-shell">Lỗi: {error}</main>;
  if (!data) return <main className="event-shell">Không có dữ liệu</main>;

  return (
    <EventFrame
      event={data.event}
      activeTab={activeTab}
      wishes={wishes}
      participantsCount={participantsCount}
      myWishCount={myWishCount}
      user={user}
      authLoading={authLoading}
      hasFirebaseConfig={hasFirebaseConfig}
      authMessage={authMessage}
      onGoogleLogin={handleGoogleLogin}
      onLogout={handleLogout}
    >
      {children}
    </EventFrame>
  );
}

export default function EventAppLayout({ children }) {
  return (
    <EventAppProvider>
      <EventAppLayoutInner>{children}</EventAppLayoutInner>
    </EventAppProvider>
  );
}

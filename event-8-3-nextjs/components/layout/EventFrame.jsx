import HeroSection from './HeroSection';
import QuickStats from './QuickStats';
import AuthSection from './AuthSection';

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

      <AuthSection
        user={user}
        authLoading={authLoading}
        hasFirebaseConfig={hasFirebaseConfig}
        authMessage={authMessage}
        onGoogleLogin={onGoogleLogin}
        onLogout={onLogout}
      />

      {children}
    </main>
  );
}

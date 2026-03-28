'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGreetingApp } from '../../context/GreetingAppContext';
import logoD12 from '../../images/D12_logo.png';
import defaultLogo from '../../images/default-logo.jpg';
import ChatWidget from './ChatWidget';

const navItems = [
  { href: '/', label: 'Nhận được' },
  { href: '/compose', label: 'Gửi thiệp' },
  { href: '/sent', label: 'Đã gửi' }
];

export default function AppShell({ title, subtitle, children, sidePanel }) {
  const pathname = usePathname();
  const { user, authLoading, authMessage, hasFirebaseConfig, handleGoogleLogin, handleLogout } =
    useGreetingApp();
  const showSidePanel = !authLoading && Boolean(user);
  const [avatarSrc, setAvatarSrc] = useState(defaultLogo.src);

  useEffect(() => {
    setAvatarSrc(user?.photoURL || defaultLogo.src);
  }, [user?.photoURL]);

  return (
    <main className="gift-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-brand">
            <Image src={logoD12} alt="D12 Logo" width={54} height={54} className="hero-logo" priority />
            <div>
              <p className="hero-kicker">6/4 Boy&apos;s Day</p>
              <p className="hero-brand-name">D12 Greeting Cards</p>
            </div>
          </div>
          <h1 className="hero-title">{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="hero-auth">
          {authLoading ? (
            <p className="hero-auth-note">Đang kiểm tra đăng nhập...</p>
          ) : user ? (
            <>
              <div className="hero-auth-card">
                <div className="hero-auth-topline">
                  <span className="hero-auth-badge">Đã đăng nhập</span>
                  <span className="hero-auth-chip">6/4 Boy&apos;s Day</span>
                </div>

                <div className="hero-user-row">
                  <div className="hero-user-avatar-wrap">
                    <img
                      src={avatarSrc}
                      alt={user.displayName || user.email || 'User'}
                      className="hero-user-avatar"
                      onError={() => setAvatarSrc(defaultLogo.src)}
                    />
                    <span className="hero-user-dot" />
                  </div>

                  <div className="hero-user-copy">
                    <strong>{user.displayName || 'Người dùng D12'}</strong>
                    <span>{user.email || 'Chưa có email'}</span>
                  </div>
                </div>

                <p className="hero-auth-note">Bạn đã sẵn sàng gửi thiệp và lời chúc đến mọi người.</p>

                <button className="btn btn-ghost hero-auth-action" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="hero-auth-note">
                {hasFirebaseConfig
                  ? 'Đăng nhập Google để gửi và nhận thiệp Boy&apos;s Day.'
                  : 'Thiếu cấu hình Firebase để bật đăng nhập Google.'}
              </p>
              <button className="btn" onClick={handleGoogleLogin} disabled={!hasFirebaseConfig}>
                Đăng nhập Google
              </button>
            </>
          )}
          {authMessage ? <p className="hero-auth-message">{authMessage}</p> : null}
        </div>
      </section>

      <nav className="top-nav">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? 'nav-pill active' : 'nav-pill'}>
            {item.label}
          </Link>
        ))}
      </nav>

      <section className={showSidePanel ? 'content-grid' : 'content-grid no-side'}>
        <div className="content-main">{children}</div>
        {showSidePanel ? <aside className="content-side">{sidePanel}</aside> : null}
      </section>

      <ChatWidget user={user} />
    </main>
  );
}

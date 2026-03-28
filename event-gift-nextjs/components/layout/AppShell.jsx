'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGreetingApp } from '../../context/GreetingAppContext';
import logoD12 from '../../images/D12_logo.png';

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

  return (
    <main className="gift-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-brand">
            <Image src={logoD12} alt="D12 Logo" width={54} height={54} className="hero-logo" priority />
            <div>
              <p className="hero-kicker">Thiệp mời ẩn danh</p>
              <p className="hero-brand-name">D12 - Event</p>
            </div>
          </div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="hero-auth">
          {authLoading ? (
            <p className="hero-auth-note">Đang kiểm tra đăng nhập...</p>
          ) : user ? (
            <>
              <p className="hero-auth-note">
                Đăng nhập với <strong>{user.displayName || user.email}</strong>
              </p>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <p className="hero-auth-note">
                {hasFirebaseConfig
                  ? 'Đăng nhập Google để gửi và nhận thiệp.'
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
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'nav-pill active' : 'nav-pill'}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className={showSidePanel ? 'content-grid' : 'content-grid no-side'}>
        <div className="content-main">{children}</div>
        {showSidePanel ? <aside className="content-side">{sidePanel}</aside> : null}
      </section>
    </main>
  );
}

'use client';

import { useGreetingApp } from '../../context/GreetingAppContext';

export default function AuthGate({ children }) {
  const { user, authLoading, hasFirebaseConfig, handleGoogleLogin } = useGreetingApp();

  if (authLoading) {
    return (
      <section className="gate-card">
        <h2>Đang mở không gian thiệp</h2>
        <p>Chờ một chút nhé.</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="gate-card">
        <h2>Đăng nhập để tiếp tục</h2>
        <p>Bạn cần đăng nhập Google trước khi xem và gửi thiệp.</p>
        <button className="btn" onClick={handleGoogleLogin} disabled={!hasFirebaseConfig}>
          Đăng nhập Google
        </button>
      </section>
    );
  }

  return children;
}

export default function AuthSection({
  user,
  authLoading,
  hasFirebaseConfig,
  authMode,
  email,
  password,
  authMessage,
  onSetEmail,
  onSetPassword,
  onSwitchAuthMode,
  onEmailAuth,
  onGoogleLogin,
  onLogout
}) {
  return (
    <section className="panel auth-panel">
      <div>
        <h3>Tài khoản tham gia</h3>
        {!authLoading && user ? (
          <div className="user-chip">
            <p>
              Đang đăng nhập: <strong>{user.displayName || user.email}</strong>
            </p>
            <button className="btn ghost" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <>
            {!hasFirebaseConfig && (
              <p className="message error">Chưa cấu hình Firebase env cho đăng nhập.</p>
            )}
            <form onSubmit={onEmailAuth} className="auth-form">
              <input
                value={email}
                onChange={(e) => onSetEmail(e.target.value)}
                type="email"
                placeholder="Email"
                required
              />
              <input
                value={password}
                onChange={(e) => onSetPassword(e.target.value)}
                type="password"
                placeholder="Mật khẩu"
                required
              />
              <div className="inline-btns">
                <button className="btn" type="submit">
                  {authMode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
                </button>
                <button
                  className="btn soft"
                  type="button"
                  onClick={onGoogleLogin}
                  disabled={!hasFirebaseConfig}
                >
                  Đăng nhập Google
                </button>
              </div>
            </form>

            <button className="switch-mode" type="button" onClick={onSwitchAuthMode}>
              {authMode === 'register' ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </button>
          </>
        )}
        {authMessage && <p className="message">{authMessage}</p>}
      </div>
    </section>
  );
}

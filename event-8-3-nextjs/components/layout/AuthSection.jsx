export default function AuthSection({
  user,
  authLoading,
  hasFirebaseConfig,
  authMessage,
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
            <p>Vui lòng đăng nhập bằng Google để gửi lời chúc, thả tim và chơi mini game.</p>
            <button
              className="btn soft"
              type="button"
              onClick={onGoogleLogin}
              disabled={!hasFirebaseConfig}
            >
              Đăng nhập Google
            </button>
          </>
        )}
        {authMessage && <p className="message">{authMessage}</p>}
      </div>
    </section>
  );
}

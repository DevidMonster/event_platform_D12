import { grandWishes } from '../../lib/event-content';

export default function HomeTab() {
  return (
    <section className="panel fade-in">
      <article className="home-card">
        <h2>✨ Lời chào mừng</h2>
        <p>
          Chào mừng toàn thể anh chị em đến với không gian 8/3. Hãy gửi một lời chúc chân thành,
          đọc các thông điệp đẹp và cùng nhau tạo nên một ngày thật vui.
        </p>
        <p>
          Điểm nhấn năm nay là khu “Lá thư 8/3” với phong cách trang nhã để mọi lời chúc đều được hiển
          thị đẹp mắt. Bạn có thể vào tab <strong>Gửi lời chúc</strong> để tham gia ngay.
        </p>
      </article>

      <div className="wish-banner">
        <p>🌸 Chúc mừng Quốc tế Phụ nữ 8/3 - Tỏa sáng theo cách của bạn 🌸</p>
      </div>

      <div className="grand-wish-grid">
        {grandWishes.map((wish) => (
          <article key={wish} className="grand-wish-card">
            <p className="wish-icon">💖</p>
            <p>{wish}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

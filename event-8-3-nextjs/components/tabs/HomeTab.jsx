import { grandWishes } from '../../lib/event-content';

export default function HomeTab() {
  return (
    <section className="panel fade-in">
      <article className="home-card">
        <h2>✨ Thông điệp 8/3 dành cho D12</h2>
        <p>
          Nhân dịp Quốc tế Phụ nữ 8/3, D12 tổ chức chương trình tôn vinh các chị/em trong đơn vị với mong muốn lan
          tỏa sự trân trọng, yêu thương và gắn kết.
        </p>
        <p>
          Đối tượng tham gia là toàn bộ thành viên D12. Mỗi người hãy viết một lời chúc ý nghĩa và dành tim cho lời
          chúc mà mình cảm thấy hay nhất.
        </p>
        <p>
          Giải thưởng sẽ được trao cho người nhận được nhiều lượt thả tim nhất. Hãy tham gia thật nhiệt tình để cùng
          nhau tạo nên một mùa 8/3 ấm áp và đáng nhớ.
        </p>
      </article>

      <div className="wish-banner">
        <p>🌸 Chúc mừng Quốc tế Phụ nữ 8/3 - Tỏa sáng theo cách của bạn! 🌸</p>
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

import Image from 'next/image';
import Link from 'next/link';

const tabs = [
  { key: 'wishes', label: '💌 Gửi lời nhắn', href: '/' },
  { key: 'home', label: '🏠 Sự kiện', href: '/wishes' }
];

export default function HeroSection({ event, tab }) {
  return (
    <header className="hero">
      <div className="hero-top">
        <div className="brand-row">
          <Image
            src="/assets/images/D12_logo.png"
            alt="D12 Logo"
            width={56}
            height={56}
            className="brand-logo"
            priority
          />
          <span className="brand-name">D12 Event</span>
        </div>
        <p className="hero-kicker">Sự kiện 8/3</p>
      </div>

      <h1>{event.name}</h1>
      <p>{event.description || 'Khong gian loi nhan va ket noi toan don vi.'}</p>

      <nav className="tabs">
        {tabs.map((item) => (
          <Link key={item.key} className={tab === item.key ? 'tab active' : 'tab'} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

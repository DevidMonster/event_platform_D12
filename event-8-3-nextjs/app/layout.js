import './globals.css';

export const metadata = {
  title: 'Su kien 8/3/2026',
  description: 'Trang su kien 8/3'
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

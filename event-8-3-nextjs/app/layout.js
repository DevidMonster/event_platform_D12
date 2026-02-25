import './globals.css';
import EventAppLayout from '../components/layout/EventAppLayout';

export const metadata = {
  title: 'Su kien 8/3/2026',
  description: 'Trang su kien 8/3'
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <EventAppLayout>{children}</EventAppLayout>
      </body>
    </html>
  );
}

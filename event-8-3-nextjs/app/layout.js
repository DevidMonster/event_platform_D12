import './globals.css';
import EventAppLayout from '../components/layout/EventAppLayout';

export const metadata = {
  title: 'Sự kiện 8/3/2026',
  description: 'Trang sự kiện 8/3'
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

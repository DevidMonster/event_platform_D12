import './globals.css';

export const metadata = {
  title: 'Event Platform',
  description: 'Internal events platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

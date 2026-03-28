import './globals.css';
import 'antd/dist/reset.css';
import { GreetingAppProvider } from '../context/GreetingAppContext';

export const metadata = {
  title: 'Thiệp Ẩn Danh',
  description: 'Gửi thiệp và lời chúc theo phong cách sự kiện.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <GreetingAppProvider>{children}</GreetingAppProvider>
      </body>
    </html>
  );
}

import './globals.css';
import 'antd/dist/reset.css';
import { GreetingAppProvider } from '../context/GreetingAppContext';

export const metadata = {
  title: "D12 - Boy's Day 6/4",
  description: 'Gửi thiệp và lời chúc cho ngày Boy&apos;s Day 6/4.'
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

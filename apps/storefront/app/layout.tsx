import type { Metadata } from 'next';
import { StoreProvider } from '@/features/cart/store-provider';
import './globals.css';
export const metadata: Metadata = {
  title: 'Flashlab — Công nghệ đỉnh, deal cực hời',
  description:
    'Khám phá điện thoại, laptop, tai nghe và đồ điện tử tại Flashlab. Flash sale mỗi ngày, công nghệ cho mọi người.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}

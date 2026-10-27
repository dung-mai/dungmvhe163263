'use client';
import { useState } from 'react';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Logo } from './site-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
const groups = [
  [
    'Dành cho khách hàng',
    'Hướng dẫn đặt hàng',
    'Thanh toán & giao hàng',
    'Phương thức thanh toán',
    'Đổi trả sản phẩm',
    'Thông tin pháp lý',
    'Bảo vệ dữ liệu cá nhân',
  ],
  [
    'Dịch vụ',
    'Gói bảo vệ thiết bị',
    'Lắp đặt tại nhà',
    'Dành cho game thủ',
    'Dịch vụ sửa chữa',
    'Thiết bị di động',
    'Trung tâm bảo hành',
  ],
  [
    'Chính sách',
    'Điều khoản sử dụng',
    'Chính sách bảo mật',
    'Chính sách giao hàng',
    'Chính sách đổi trả',
  ],
  [
    'Về Flashlab',
    'Bản tin công nghệ',
    'Câu chuyện Flashlab',
    'Trách nhiệm cộng đồng',
    'Phát triển bền vững',
    'Thông tin báo chí',
  ],
  ['Liên kết nhanh', 'Giới thiệu', 'Liên hệ', 'Câu hỏi thường gặp', 'Blog'],
];
export function SiteFooter({ onInfo }: { onInfo: (s: string) => void }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  return (
    <>
      <section className="newsletter">
        <div className="content-container newsletter-inner">
          <h2>
            Đăng ký nhận ưu đãi <strong>5%</strong>!
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMessage('Đăng ký bản tin sẽ sớm mở. Email chưa được gửi hoặc lưu.');
            }}
          >
            <label className="sr-only" htmlFor="newsletter-email">
              Email nhận ưu đãi
            </label>
            <Input
              id="newsletter-email"
              type="email"
              placeholder="Email của bạn"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              Đăng ký
            </Button>
          </form>
        </div>
        {message && (
          <p className="newsletter-message" role="status">
            {message}
          </p>
        )}
      </section>
      <footer className="site-footer">
        <div className="content-container">
          <div className="footer-columns">
            {groups.map(([title, ...links]) => (
              <div key={title}>
                <h3>{title}</h3>
                {links.map((link) => (
                  <button
                    key={link}
                    onClick={() =>
                      onInfo(`${link}: Nội dung đang được cập nhật cho phiên bản chính thức.`)
                    }
                  >
                    {link}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="footer-brand">
            <Logo light />
            <div className="social-links">
              {[Instagram, Youtube, Facebook, Linkedin].map((Icon, i) => (
                <button
                  key={i}
                  aria-label={['Instagram', 'YouTube', 'Facebook', 'LinkedIn'][i]}
                  onClick={() =>
                    onInfo('Kênh mạng xã hội chính thức sẽ được cập nhật khi Flashlab ra mắt.')
                  }
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
          <p className="copyright">
            © {new Date().getFullYear()} Flashlab. All rights reserved. <span>·</span> Storefront
            demo
          </p>
        </div>
      </footer>
    </>
  );
}

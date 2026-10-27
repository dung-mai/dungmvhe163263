'use client';
import Image from 'next/image';
import { ArrowRight, BadgePercent, Headphones, PackageCheck, RotateCcw, Zap } from 'lucide-react';
import type { Category, Product } from '@flashlab/contracts';
import type { CatalogSelection } from '@/components/catalog/catalog-panel';
import { ProductCard } from '@/components/catalog/product-card';
import { Button } from '@/components/ui/button';
export function SectionHeading({
  title,
  onView,
  children,
}: {
  title: string;
  onView?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-title-group">
        <h2>{title}</h2>
        {children}
      </div>
      {onView && (
        <Button variant="outline" size="sm" className="view-all" onClick={onView}>
          Xem tất cả <ArrowRight size={12} />
        </Button>
      )}
    </div>
  );
}
export function Categories({
  categories,
  onCatalog,
}: {
  categories: Category[];
  onCatalog: (s: CatalogSelection) => void;
}) {
  return (
    <section className="home-section category-section">
      <SectionHeading title="Danh mục nổi bật" />
      <div className="category-grid">
        {categories.map((c) => (
          <button
            key={c.slug}
            className="category-card"
            onClick={() => onCatalog({ title: c.name, category: c.slug })}
          >
            <div>
              <Image src={c.image} alt={c.name} width={160} height={150} />
            </div>
            <h3>{c.name}</h3>
          </button>
        ))}
      </div>
      <div className="section-progress" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
export function ProductSection({
  title,
  products,
  columns = 6,
  onView,
  children,
  id,
}: {
  title: string;
  products: Product[];
  columns?: 5 | 6;
  onView: () => void;
  children?: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="home-section" id={id}>
      <SectionHeading title={title} onView={onView}>
        {children}
      </SectionHeading>
      {products.length ? (
        <div className={`product-grid columns-${columns}`}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="empty-section">Sản phẩm đang được cập nhật.</p>
      )}
    </section>
  );
}
export function NewArrivals({
  products,
  onCatalog,
}: {
  products: Product[];
  onCatalog: (s: CatalogSelection) => void;
}) {
  const open = () => onCatalog({ title: 'Mới lên kệ', collection: 'new-in' });
  return (
    <section className="home-section">
      <SectionHeading title="Mới lên kệ" onView={open} />
      <div className="new-banners">
        <button className="promo-banner promo-aqua" onClick={open}>
          <div>
            <span className="promo-brand">
              BOSE <small>QUIETCOMFORT</small>
            </span>
            <h3>
              Âm thanh mới.
              <br />
              Cảm xúc mới.
            </h3>
            <p>
              Chạm vào thế giới riêng
              <br />
              với chống ồn đỉnh cao.
            </p>
            <span className="promo-cta">Khám phá ngay</span>
          </div>
          <Image
            src="/images/products/bose.webp"
            alt="Bose QuietComfort"
            width={300}
            height={300}
          />
          <span className="floating-label">New In</span>
        </button>
        <button className="promo-banner promo-neutral" onClick={open}>
          <div>
            <span className="promo-brand">
              SONY <small>PLAY HAS NO LIMITS</small>
            </span>
            <h3>
              Thế giới game.
              <br />
              Trong tầm tay.
            </h3>
            <span className="promo-cta">Khám phá ngay</span>
          </div>
          <Image
            src="/images/products/playstation.webp"
            alt="PlayStation 5"
            width={300}
            height={300}
          />
        </button>
      </div>
      <div className="section-progress progress-center" aria-hidden="true">
        <span />
      </div>
      <div className="new-arrivals-grid">
        <div className="new-small-grid">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>
        {products[8] && <ProductCard product={products[8]} featured />}
      </div>
    </section>
  );
}
export function CampaignBanner({ onCatalog }: { onCatalog: (s: CatalogSelection) => void }) {
  return (
    <section className="campaign-banner">
      <Image
        className="campaign-image-left"
        src="/images/products/rog.webp"
        alt="Laptop ASUS ROG"
        width={400}
        height={300}
      />
      <div>
        <span>APPLE MACBOOK</span>
        <h2>
          Nâng tầm trải nghiệm.
          <br />
          Chạm giá bất ngờ!
        </h2>
        <p>MacBook hiệu năng vượt trội. Ưu đãi dành riêng cho bạn.</p>
        <Button onClick={() => onCatalog({ title: 'Laptop', category: 'laptops' })}>
          Khám phá ngay
        </Button>
      </div>
      <Image
        className="campaign-image-right"
        src="/images/products/macbook.webp"
        alt="Apple MacBook"
        width={400}
        height={300}
      />
    </section>
  );
}
export const articles = [
  {
    image: '/images/blog-power.svg',
    date: '24.10.2026',
    title: 'Giữ thiết bị bền lâu: Những thói quen nhỏ tạo khác biệt',
    description: 'Mẹo đơn giản để đồ công nghệ luôn hoạt động mượt mà mỗi ngày.',
  },
  {
    image: '/images/blog-sale.svg',
    date: '22.10.2026',
    title: 'Săn deal thông minh: Sẵn sàng cho mùa sale lớn',
    description: 'Những điều cần biết để chọn đúng thiết bị với mức giá tốt.',
  },
  {
    image: '/images/blog-payment.svg',
    date: '20.10.2026',
    title: 'Mua sắm theo cách của bạn: Thanh toán linh hoạt',
    description: 'Khám phá các phương thức thanh toán cho trải nghiệm mua sắm tiện lợi.',
  },
];
export function BlogSection({ onInfo }: { onInfo: (s: string) => void }) {
  return (
    <section className="home-section blog-section">
      <SectionHeading
        title="Góc công nghệ"
        onView={() =>
          onInfo('Blog Flashlab sẽ sớm ra mắt. Các bài viết hiện là nội dung minh họa.')
        }
      />
      <div className="blog-grid">
        {articles.map((a) => (
          <button
            className="blog-card"
            key={a.title}
            onClick={() =>
              onInfo(`${a.title} — Bài viết minh họa. Nội dung đầy đủ sẽ được cập nhật sau.`)
            }
          >
            <Image src={a.image} alt="" width={600} height={320} />
            <time>{a.date}</time>
            <h3>{a.title}</h3>
            <p>{a.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
export function Benefits({ onInfo }: { onInfo: (s: string) => void }) {
  const benefits = [
    { icon: PackageCheck, title: 'Giao hàng nhanh', text: 'Giao tận nơi, an tâm nhận hàng' },
    { icon: BadgePercent, title: 'Flashlab Member', text: 'Ưu đãi riêng dành cho thành viên' },
    { icon: RotateCcw, title: 'Đổi trả dễ dàng', text: 'Hỗ trợ đổi trả trong 30 ngày' },
    { icon: Headphones, title: 'Hỗ trợ tận tâm', text: 'Đồng hành cùng bạn mỗi ngày' },
  ];
  return (
    <section className="benefits" aria-label="Dịch vụ Flashlab">
      {benefits.map((b) => (
        <button
          key={b.title}
          onClick={() =>
            onInfo(
              `${b.title}: Chính sách minh họa, sẽ được xác nhận khi Flashlab chính thức mở bán.`,
            )
          }
        >
          <b.icon size={24} strokeWidth={1.5} />
          <h3>{b.title}</h3>
          <p>{b.text}</p>
        </button>
      ))}
    </section>
  );
}
export function FlashSaleTitle() {
  return <Zap className="flash-icon" size={24} fill="currentColor" />;
}

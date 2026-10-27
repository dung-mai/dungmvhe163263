import { ProductCard } from '@/components/catalog/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeading } from '@/features/home/components/home-sections';
import type { Product } from '@flashlab/contracts';
import { ShoppingCart, Heart, Search, Zap } from 'lucide-react';
const product: Product = {
  id: 'ds-galaxy',
  slug: 'ds-galaxy',
  name: 'Samsung Galaxy S23 256GB Tím Lavender',
  description: 'Component reference',
  brand: 'Samsung',
  category: 'smartphones',
  image: '/images/products/galaxy.webp',
  images: [],
  price: '14990000',
  originalPrice: null,
  currency: 'VND',
  rating: 4.8,
  reviewCount: 178,
  badge: null,
  available: true,
};
const colors = [
  ['Primary', '#cf0a49'],
  ['Background', '#f5f5f5'],
  ['Card', '#ffffff'],
  ['Header', '#303030'],
  ['Footer', '#202020'],
  ['Sale', '#be0b43'],
  ['Muted', '#717171'],
  ['Rating', '#e5ac16'],
];
export const metadata = { title: 'Flashlab — Design system' };
export default function DesignSystem() {
  return (
    <main id="main-content" className="storefront-shell p-6 md:p-14">
      <div className="mb-12 flex items-center justify-between border-b pb-8">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[.2em] text-primary">
            FLASHLAB / UI REFERENCE / V1
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Một hệ thống. Mọi điểm chạm.</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Chuẩn triển khai storefront từ ảnh reference đã duyệt. Đây là bộ component thực tế được
            dùng trên trang chủ, không phải moodboard.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/">Trang chủ</a>
        </Button>
      </div>
      <section className="mb-12">
        <h2 className="mb-5 text-xl">01 — Color tokens</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {colors.map(([name, value]) => (
            <div className="rounded-lg border bg-card p-3" key={name}>
              <div className="mb-3 h-16 rounded border" style={{ background: value }} />
              <p className="text-sm font-medium">{name}</p>
              <code className="text-xs text-muted-foreground">{value}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="mb-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-5 text-xl">02 — Typography & spacing</h2>
          <p className="text-[38px] leading-tight tracking-tight">Hero / 38px</p>
          <p className="mt-4 text-[27px] tracking-tight">Section heading / 27px</p>
          <p className="mt-4 text-sm">Body / 14px · Product title / 12px</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Metadata / 9–11px · Giá / 15px semibold
          </p>
          <div className="mt-5 flex items-end gap-3">
            {[4, 8, 12, 16, 24, 32, 48].map((n) => (
              <div key={n} className="text-center text-xs">
                <div className="mb-2 w-6 bg-primary/20" style={{ height: n }} />
                {n}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-5 text-xl">03 — Controls & states</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Xem tất cả</Button>
            <Button variant="secondary">Khám phá</Button>
            <Button disabled>Disabled</Button>
            <Button size="icon" aria-label="Giỏ hàng mẫu">
              <ShoppingCart />
            </Button>
            <Button variant="outline" size="icon" aria-label="Yêu thích mẫu">
              <Heart />
            </Button>
          </div>
          <Input
            aria-label="Input tham chiếu"
            placeholder="Bạn đang tìm gì hôm nay?"
            className="mt-4 bg-white"
          />
          <div className="mt-4 flex items-center gap-4">
            <Badge>Mới</Badge>
            <Badge variant="outline">Đáng mua</Badge>
            <Search size={18} />
            <Zap size={18} className="text-primary" />
          </div>
          <Skeleton className="mt-5 h-14" />
        </div>
      </section>
      <section className="mb-12">
        <h2 className="mb-5 text-xl">04 — Product cards</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <ProductCard product={product} />
          <ProductCard
            product={{
              ...product,
              id: 'ds-sale',
              price: '11990000',
              originalPrice: '14990000',
              badge: 'Giá sốc',
            }}
          />
          <ProductCard product={{ ...product, id: 'ds-new', badge: 'Mới' }} />
          <ProductCard product={{ ...product, id: 'ds-unavailable', available: false }} />
          <ProductCard product={{ ...product, id: 'ds-compact', badge: 'Đáng mua' }} compact />
        </div>
      </section>
      <section>
        <h2 className="mb-5 text-xl">05 — Section & layout rules</h2>
        <SectionHeading title="Bán chạy nhất" />
        <div className="rounded-lg border bg-card p-5 text-sm leading-7 text-muted-foreground">
          <p>Content max-width: 1140px · Section gap: 48px · Grid gap: 10–12px.</p>
          <p>Desktop: 7 categories, 6 bestseller cards, 5 flash sale cards.</p>
          <p>Tablet: giảm typography và khoảng cách, giữ thứ tự nội dung.</p>
          <p>Mobile: header hai hàng, category cuộn ngang, sản phẩm 2–3 cột, footer 2 cột.</p>
          <p>Focus rõ ràng, hỗ trợ bàn phím, giảm animation theo prefers-reduced-motion.</p>
        </div>
      </section>
    </main>
  );
}

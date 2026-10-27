'use client';
import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  Phone,
  Search,
  ShoppingCart,
  UserRound,
  Zap,
} from 'lucide-react';
import type { Category } from '@flashlab/contracts';
import type { CatalogSelection } from '@/components/catalog/catalog-panel';
import { useStore } from '@/features/cart/store-provider';
import { Button } from '@/components/ui/button';
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label="Flashlab — Trang chủ">
      <span>
        <b>f</b>lashlab<span className="logo-bolt">ϟ</span>
      </span>
      <small>TECH. DEALS. EVERYDAY.</small>
    </a>
  );
}
export function SiteHeader({
  categories,
  onCatalog,
  onPanel,
  onAccount,
  onInfo,
}: {
  categories: Category[];
  onCatalog: (s: CatalogSelection) => void;
  onPanel: (p: 'cart' | 'wishlist') => void;
  onAccount: () => void;
  onInfo: (s: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const { cart, wishlist } = useStore();
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="content-container utility-inner">
          <button
            onClick={() =>
              onInfo(
                'Khu vực giao hàng: Toàn quốc. Thời gian và phí giao hàng sẽ được cập nhật khi mở checkout.',
              )
            }
          >
            <MapPin size={13} />
            <span>Hồ Chí Minh</span>
            <ChevronDown size={11} />
          </button>
          <div className="utility-links">
            <button onClick={() => onInfo('Thông tin hỗ trợ khách hàng đang được cập nhật.')}>
              Khách hàng <ChevronDown size={11} />
            </button>
            <button onClick={() => onInfo('Chương trình dành cho doanh nghiệp sẽ sớm ra mắt.')}>
              Doanh nghiệp <ChevronDown size={11} />
            </button>
            <button
              onClick={() =>
                onInfo('Chính sách thanh toán và giao hàng sẽ được công bố trước khi mở bán.')
              }
            >
              Thanh toán & giao hàng
            </button>
            <button onClick={() => onInfo('Gift card sẽ sớm ra mắt.')}>Gift card</button>
          </div>
          <button
            className="utility-phone"
            onClick={() =>
              onInfo('Hotline minh họa: 1900 6868. Bản demo chưa cung cấp hỗ trợ qua điện thoại.')
            }
          >
            <Phone size={13} />
            <span>1900 6868</span>
            <small>
              Hỗ trợ mỗi ngày
              <br />
              8:00 – 22:00
            </small>
          </button>
        </div>
      </div>
      <div className="main-header">
        <div className="content-container main-header-inner">
          <Logo light />
          <div className="catalog-wrap">
            <Button
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              className="catalog-toggle"
            >
              <Menu size={17} />
              <span>Danh mục</span>
            </Button>
            {menu && (
              <div className="catalog-dropdown">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => {
                      onCatalog({ title: c.name, category: c.slug });
                      setMenu(false);
                    }}
                  >
                    {c.name}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="search-form"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim())
                onCatalog({ title: `Tìm kiếm: ${search.trim()}`, search: search.trim() });
            }}
          >
            <input
              type="search"
              aria-label="Tìm kiếm sản phẩm"
              placeholder="Bạn đang tìm gì hôm nay?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
            />
            <button type="submit" aria-label="Tìm kiếm">
              <Search size={19} />
            </button>
          </form>
          <div className="header-actions">
            <button
              onClick={() => onPanel('wishlist')}
              aria-label={`Yêu thích (${wishlist.length})`}
            >
              <Heart />
              <span>Yêu thích</span>
              {wishlist.length > 0 && <i>{wishlist.length}</i>}
            </button>
            <button onClick={onAccount} aria-label="Tài khoản">
              <UserRound />
              <span>Tài khoản</span>
            </button>
            <button onClick={() => onPanel('cart')} aria-label={`Giỏ hàng (${count})`}>
              <ShoppingCart />
              <span>Giỏ hàng ({count})</span>
            </button>
          </div>
        </div>
      </div>
      <nav className="category-nav" aria-label="Danh mục sản phẩm">
        <div className="content-container category-nav-inner">
          <a className="sale-nav" href="#flash-sale">
            <Zap size={13} fill="currentColor" /> Flash sale
          </a>
          {categories.map((c) => (
            <button key={c.slug} onClick={() => onCatalog({ title: c.name, category: c.slug })}>
              {c.name}
            </button>
          ))}
          <button
            onClick={() => onCatalog({ title: 'Tất cả sản phẩm' })}
            aria-label="Xem tất cả danh mục"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </nav>
    </header>
  );
}

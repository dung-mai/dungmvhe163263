'use client';
import Image from 'next/image';
import { Heart, ShoppingCart, Star, Check } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@flashlab/contracts';
import { Button } from '@/components/ui/button';
import { useStore } from '@/features/cart/store-provider';
import { cn } from '@/lib/utils';
import { discountPercent, formatMoney } from '@/lib/formatters';
export function ProductCard({
  product,
  featured = false,
  compact = false,
}: {
  product: Product;
  featured?: boolean;
  compact?: boolean;
}) {
  const { add, toggle, wishlist } = useStore();
  const [added, setAdded] = useState(false);
  const favorite = wishlist.some((p) => p.id === product.id);
  const discount = discountPercent(product.price, product.originalPrice);
  function addToCart() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }
  return (
    <article
      className={cn('product-card', featured && 'product-featured', compact && 'product-compact')}
      data-testid="product-card"
    >
      <div className="product-visual">
        {product.badge && (
          <span
            className={cn(
              'product-badge',
              product.badge === 'Mới'
                ? 'badge-new'
                : product.badge === 'Giá sốc'
                  ? 'badge-hot'
                  : 'badge-choice',
            )}
          >
            {product.badge}
          </span>
        )}
        <button
          className={cn('wishlist-button', favorite && 'is-favorite')}
          onClick={() => toggle(product)}
          aria-label={`${favorite ? 'Bỏ yêu thích' : 'Yêu thích'} ${product.name}`}
          aria-pressed={favorite}
        >
          <Heart size={17} strokeWidth={1.4} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <Image
          src={product.image}
          alt={product.name}
          width={400}
          height={400}
          className="product-image"
          sizes={featured ? '(max-width: 640px) 45vw, 300px' : '(max-width: 640px) 45vw, 200px'}
        />
        {!compact && (
          <div className="image-dots" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <div className="product-info">
        {!compact && (
          <div className="product-rating">
            <Star size={12} fill="currentColor" strokeWidth={0} />
            <span>{product.rating.toFixed(1)}</span>
            <span className="review-count">{product.reviewCount} đánh giá</span>
          </div>
        )}
        <h3 title={product.name}>{product.name}</h3>
        <div className="product-purchase">
          <div className="price-stack">
            {discount > 0 && (
              <div className="old-price">
                <span>−{discount}%</span>
                <del>{formatMoney(product.originalPrice!)}</del>
              </div>
            )}
            <strong className={discount > 0 ? 'sale-price' : ''}>
              {formatMoney(product.price)}
            </strong>
          </div>
          <Button
            size="icon-sm"
            disabled={!product.available}
            onClick={addToCart}
            aria-label={`Thêm ${product.name} vào giỏ`}
            className="add-cart"
          >
            {added ? <Check size={16} /> : <ShoppingCart size={16} />}
          </Button>
        </div>
        {!product.available && <span className="text-xs text-muted-foreground">Tạm hết hàng</span>}
      </div>
    </article>
  );
}

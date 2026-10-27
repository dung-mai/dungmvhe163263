'use client';
import Image from 'next/image';
import { Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useStore } from '@/features/cart/store-provider';
import { formatMoney } from '@/lib/formatters';
import { ProductCard } from '@/components/catalog/product-card';
export function StorePanels({
  panel,
  onClose,
}: {
  panel: 'cart' | 'wishlist' | null;
  onClose: () => void;
}) {
  const { cart, wishlist, change } = useStore();
  const total = cart.reduce((sum, i) => sum + BigInt(i.product.price) * BigInt(i.quantity), 0n);
  return (
    <Sheet
      open={!!panel}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{panel === 'cart' ? 'Giỏ hàng của bạn' : 'Sản phẩm yêu thích'}</SheetTitle>
          <SheetDescription>
            Được lưu trên thiết bị này. Đây là bản demo, chưa hỗ trợ thanh toán.
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-8">
          {panel === 'cart' ? (
            cart.length ? (
              <>
                <div>
                  {cart.map((i) => (
                    <div key={i.product.id} className="flex gap-3 border-b py-5">
                      <Image
                        width={64}
                        height={64}
                        src={i.product.image}
                        alt={i.product.name}
                        className="size-16 object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm leading-5">{i.product.name}</h3>
                        <strong className="text-sm">{formatMoney(i.product.price)}</strong>
                        <div className="mt-2 flex items-center gap-3">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => change(i.product.id, -1)}
                            aria-label={`Giảm ${i.product.name}`}
                          >
                            <Minus />
                          </Button>
                          <span>{i.quantity}</span>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            disabled={i.quantity >= 99}
                            onClick={() => change(i.product.id, 1)}
                            aria-label={`Tăng ${i.product.name}`}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-6 font-semibold">
                  <span>Tạm tính</span>
                  <span data-testid="cart-total">{formatMoney(total.toString())}</span>
                </div>
                <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  Giỏ hàng demo. Giá sẽ cần được xác nhận lại bởi backend khi triển khai checkout.
                </p>
              </>
            ) : (
              <Empty icon="cart" text="Giỏ hàng đang trống." />
            )
          ) : wishlist.length ? (
            <div className="grid grid-cols-2 gap-4">
              {wishlist.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Empty icon="heart" text="Bạn chưa có sản phẩm yêu thích." />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
function Empty({ icon, text }: { icon: 'cart' | 'heart'; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
      {icon === 'cart' ? <ShoppingBag size={40} /> : <Heart size={40} />}
      <p>{text}</p>
    </div>
  );
}

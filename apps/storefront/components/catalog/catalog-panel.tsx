'use client';
import { useEffect, useState } from 'react';
import type { ProductPage } from '@flashlab/contracts';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ProductCard } from './product-card';
import { request } from '@/lib/api/client';
export interface CatalogSelection {
  title: string;
  search?: string;
  category?: string;
  collection?: string;
}
export function CatalogPanel({
  selection,
  onClose,
}: {
  selection: CatalogSelection | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<ProductPage | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setPage(1);
    setData(null);
  }, [selection]);
  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const query = new URLSearchParams({ page: String(page), limit: '12' });
    if (selection.search) query.set('search', selection.search);
    if (selection.category) query.set('category', selection.category);
    if (selection.collection) query.set('collection', selection.collection);
    request<ProductPage>(`/products?${query}`, { signal: controller.signal })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selection, page, attempt]);
  return (
    <Sheet
      open={!!selection}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="catalog-sheet overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{selection?.title}</SheetTitle>
          <SheetDescription>Khám phá sản phẩm tại Flashlab · Giá và dữ liệu demo.</SheetDescription>
        </SheetHeader>
        <div className="p-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : error ? (
            <div role="alert">
              <p>Chưa tải được sản phẩm.</p>
              <Button variant="outline" onClick={() => setAttempt((a) => a + 1)}>
                Thử lại
              </Button>
            </div>
          ) : data?.items.length ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <span className="text-sm">
                  Trang {page} / {Math.max(1, Math.ceil(data.total / data.limit))}
                </span>
                <Button
                  variant="outline"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-muted-foreground">
              Không tìm thấy sản phẩm phù hợp.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

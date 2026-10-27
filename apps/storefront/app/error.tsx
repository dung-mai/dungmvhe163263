'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-8">
      <div className="max-w-md space-y-5 text-center">
        <h1 className="text-3xl font-semibold">Flashlab sẽ trở lại ngay</h1>
        <p className="text-muted-foreground">
          Chưa kết nối được danh mục sản phẩm. Vui lòng thử lại sau giây lát.
        </p>
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </main>
  );
}

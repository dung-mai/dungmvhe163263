import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6" aria-label="Đang tải Flashlab">
      <Skeleton className="h-24" />
      <Skeleton className="h-80" />
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </main>
  );
}

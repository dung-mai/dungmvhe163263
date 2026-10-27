'use client';
import { useEffect, useState } from 'react';
import type { Sale } from '@flashlab/contracts';
export function Countdown({
  sale,
  serverTime,
  onExpired,
}: {
  sale: Sale;
  serverTime: string;
  onExpired: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const offset = Date.parse(serverTime) - Date.now();
    let notified = false;
    const tick = () => {
      const target = sale.status === 'upcoming' ? sale.startsAt : sale.endsAt;
      const delta = Math.max(0, Date.parse(target) - Date.now() - offset);
      setRemaining(delta);
      if (delta === 0 && !notified) {
        notified = true;
        onExpired();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sale, serverTime, onExpired]);
  if (remaining === null)
    return <span className="countdown-placeholder" aria-label="Đang tải thời gian ưu đãi" />;
  if (remaining <= 0)
    return <span className="text-xs text-muted-foreground">Đang cập nhật ưu đãi…</span>;
  const seconds = Math.floor(remaining / 1000);
  const values = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  return (
    <div
      className="countdown"
      aria-label={`${sale.status === 'upcoming' ? 'Bắt đầu' : 'Kết thúc'} sau ${values[0]} giờ ${values[1]} phút ${values[2]} giây`}
    >
      <span>{sale.status === 'upcoming' ? 'Bắt đầu sau' : 'Kết thúc sau'}</span>
      {values.map((n, i) => (
        <span className="countdown-part" key={i}>
          <b>{String(n).padStart(2, '0')}</b>
          {i < 2 && <i>:</i>}
        </span>
      ))}
    </div>
  );
}

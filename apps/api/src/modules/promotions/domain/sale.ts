import type { SaleStatus } from '@flashlab/contracts';
export function saleStatus(startsAt: Date, endsAt: Date, now: Date): SaleStatus {
  if (now < startsAt) return 'upcoming';
  if (now >= endsAt) return 'ended';
  return 'active';
}
export function effectivePrice(
  base: string,
  sale: { price: string; startsAt: Date; endsAt: Date } | undefined,
  now: Date,
): string {
  return sale &&
    saleStatus(sale.startsAt, sale.endsAt, now) === 'active' &&
    BigInt(sale.price) < BigInt(base)
    ? sale.price
    : base;
}

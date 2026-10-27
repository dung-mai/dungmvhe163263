import type { Money } from '@flashlab/contracts';
export const formatMoney = (amount: Money) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(BigInt(amount));
export function discountPercent(price: Money, original: Money | null) {
  return original && BigInt(original) > 0n
    ? Number(((BigInt(original) - BigInt(price)) * 100n) / BigInt(original))
    : 0;
}

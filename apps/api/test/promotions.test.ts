import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectivePrice, saleStatus } from '../src/modules/promotions/domain/sale';
const start = new Date('2026-01-01T10:00:00Z'),
  end = new Date('2026-01-01T11:00:00Z');
test('sale interval is inclusive at start, exclusive at end', () => {
  assert.equal(saleStatus(start, end, new Date(start.getTime() - 1)), 'upcoming');
  assert.equal(saleStatus(start, end, start), 'active');
  assert.equal(saleStatus(start, end, new Date(end.getTime() - 1)), 'active');
  assert.equal(saleStatus(start, end, end), 'ended');
});
test('only a lower active promotion changes price; integer precision is preserved', () => {
  const sale = { price: '9007199254740992', startsAt: start, endsAt: end };
  assert.equal(effectivePrice('9007199254740993', sale, start), '9007199254740992');
  assert.equal(effectivePrice('100', { ...sale, price: '101' }, start), '100');
  assert.equal(effectivePrice('100', { ...sale, price: '90' }, end), '100');
  assert.equal(effectivePrice('100', undefined, start), '100');
});

import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { PrismaService } = require('../dist/infrastructure/prisma.service.js');
let app, base, prisma;
before(async () => {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  prisma = app.get(PrismaService);
});
after(async () => {
  await app?.close();
});
const get = (path) => fetch(`${base}/api${path}`);
test('health probes the actual database', async () => {
  const response = await get('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'up' });
});
test('home returns all selected sections and active campaign', async () => {
  const response = await get('/home');
  assert.equal(response.status, 200);
  const home = await response.json();
  assert.equal(home.categories.length, 7);
  assert.equal(home.banners.length, 3);
  assert.equal(home.bestSellers.length, 6);
  assert.equal(home.newArrivals.length, 9);
  assert.equal(home.topSales.length, 5);
  assert.equal(home.flashSale.status, 'active');
  assert.ok(Date.parse(home.serverTime));
  assert.equal(home.bestSellers[0].slug, 'xiaomi-monitor-a24i');
});
test('repository persists seeded variants and maps exact money strings', async () => {
  assert.equal(await prisma.product.count(), 34);
  const response = await get('/products/samsung-galaxy-s23');
  assert.equal(response.status, 200);
  const p = await response.json();
  assert.equal(p.price, '14990000');
  assert.equal(p.originalPrice, '18990000');
  assert.equal(p.currency, 'VND');
  assert.equal(p.brand, 'Samsung');
  assert.ok(p.image.startsWith('/images/'));
  assert.equal('variants' in p, false);
});
test('search, category filtering and pagination use the database', async () => {
  const result = await (
    await get('/products?search=Samsung&category=smartphones&limit=2&page=1')
  ).json();
  assert.equal(result.items.length, 2);
  assert.ok(result.total >= 2);
  assert.ok(result.items.every((p) => p.brand === 'Samsung' && p.category === 'smartphones'));
  const a = await (await get('/products?limit=3&page=1')).json();
  const b = await (await get('/products?limit=3&page=2')).json();
  assert.ok(!a.items.some((x) => b.items.some((y) => x.id === y.id)));
  const empty = await (await get('/products?search=nonexistent-xyz')).json();
  assert.equal(empty.total, 0);
});
test('collection order is stable across pagination', async () => {
  const full = await (await get('/products?collection=best-sellers&limit=6')).json();
  const first = await (await get('/products?collection=best-sellers&limit=3')).json();
  const second = await (await get('/products?collection=best-sellers&limit=3&page=2')).json();
  assert.deepEqual(
    [...first.items, ...second.items].map((p) => p.id),
    full.items.map((p) => p.id),
  );
});
test('draft and missing products return sanitized 404 with request id', async () => {
  for (const slug of ['draft-product', 'missing']) {
    const response = await get(`/products/${slug}`);
    assert.equal(response.status, 404);
    const error = await response.json();
    assert.equal(error.requestId, response.headers.get('x-request-id'));
    assert.ok(error.message);
    assert.equal('stack' in error, false);
  }
  const list = await (await get('/products?limit=48')).json();
  assert.equal(
    list.items.some((p) => p.slug === 'draft-product'),
    false,
  );
});
test('invalid query and unknown fields are rejected', async () => {
  for (const query of [
    'limit=49',
    'limit=0',
    'page=-1',
    'page=1.5',
    'category=bad!',
    'unknown=field',
  ])
    assert.equal((await get(`/products?${query}`)).status, 400, query);
});
test('flash sale applies only the active lower price', async () => {
  const p = await (await get('/products/blender-pro')).json();
  assert.equal(p.price, '1431000');
  assert.equal(p.originalPrice, '2190000');
  const original = await prisma.flashSale.findUniqueOrThrow({ where: { id: 'daily-flash' } });
  try {
    await prisma.flashSale.update({
      where: { id: original.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    const ended = await (await get('/products/blender-pro')).json();
    assert.equal(ended.price, '1590000');
  } finally {
    await prisma.flashSale.update({
      where: { id: original.id },
      data: { endsAt: original.endsAt },
    });
  }
});
test('request ids propagate, invalid ids are regenerated and docs expose contract', async () => {
  const response = await fetch(`${base}/api/products`, {
    headers: { 'x-request-id': 'flashlab-test' },
  });
  assert.equal(response.headers.get('x-request-id'), 'flashlab-test');
  const bad = await fetch(`${base}/api/health`, { headers: { 'x-request-id': 'invalid/id' } });
  assert.notEqual(bad.headers.get('x-request-id'), 'invalid/id');
  const docs = await (await get('/docs-json')).json();
  assert.ok(docs.paths['/api/products']);
  assert.equal(
    docs.paths['/api/products/{slug}'].get.responses['200'].content['application/json'].schema
      .properties.price.type,
    'string',
  );
});

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
test('homepage renders seeded sections, healthy images and consistent responsive layout', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const name of [
    'Danh mục nổi bật',
    'Bán chạy nhất',
    'Mới lên kệ',
    'Flash sale',
    'Góc công nghệ',
  ])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(20);
  await page.evaluate(() => {
    for (const im of document.images) im.loading = 'eager';
  });
  await expect
    .poll(() => page.evaluate(() => Array.from(document.images).every((im) => im.complete)), {
      timeout: 10000,
    })
    .toBeTruthy();
  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter((im) => !im.complete || im.naturalWidth === 0)
      .map((im) => im.src),
  );
  expect(broken).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('homepage.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
test('search, category filtering, collection panels and empty search work', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: 'Tìm kiếm sản phẩm' });
  await search.fill('Samsung');
  await search.press('Enter');
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('heading', { name: 'Tìm kiếm: Samsung' })).toBeVisible();
  await expect(panel.locator('[data-testid="product-card"]').first()).toBeVisible();
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await search.fill('nonexistent-xyz');
  await search.press('Enter');
  await expect(panel.getByText('Không tìm thấy sản phẩm phù hợp.')).toBeVisible();
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Danh mục sản phẩm' })
    .getByRole('button', { name: 'Laptop', exact: true })
    .click();
  await expect(panel.getByRole('heading', { name: 'Laptop', exact: true })).toBeVisible();
  await expect(panel.locator('[data-testid="product-card"]').first()).toBeVisible();
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Bán chạy nhất', exact: true }) });
  await section.getByRole('button', { name: 'Xem tất cả' }).click();
  await expect(panel.locator('[data-testid="product-card"]')).toHaveCount(6);
});
test('cart and wishlist persist locally and support quantity changes', async ({ page }) => {
  const name = 'Xiaomi Monitor A24i 24 inch FHD IPS 100Hz';
  await page.getByRole('button', { name: `Thêm ${name} vào giỏ`, exact: true }).click();
  await page.getByRole('button', { name: `Yêu thích ${name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Giỏ hàng (1)', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Giỏ hàng (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Giỏ hàng (1)', exact: true }).click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: `Tăng ${name}`, exact: true }).click();
  await expect(panel.getByTestId('cart-total')).toContainText('5.180.000');
  await panel.getByRole('button', { name: `Giảm ${name}`, exact: true }).click();
  await panel.getByRole('button', { name: `Giảm ${name}`, exact: true }).click();
  await expect(panel.getByText('Giỏ hàng đang trống.')).toBeVisible();
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Yêu thích (1)', exact: true }).click();
  await expect(panel.getByText(name, { exact: true })).toBeVisible();
});
test('carousel works and demo newsletter does not pretend to subscribe', async ({ page }) => {
  const first = page.getByRole('button', { name: 'Xem banner 1', exact: true });
  await expect(first).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Banner tiếp theo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xem banner 2', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await page.getByLabel('Email nhận ưu đãi', { exact: true }).fill('demo@example.com');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Email chưa được gửi hoặc lưu.');
});
test('catalog error and retry are visible', async ({ page }) => {
  await page.route('**/api/products?**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.getByRole('searchbox', { name: 'Tìm kiếm sản phẩm' }).fill('Samsung');
  await page.getByRole('searchbox').press('Enter');
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('alert')).toContainText('Chưa tải được sản phẩm.');
  await page.unroute('**/api/products?**');
  await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(panel.locator('[data-testid="product-card"]').first()).toBeVisible();
});
test('design system documents actual product states', async ({ page }) => {
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { name: 'Một hệ thống. Mọi điểm chạm.' })).toBeVisible();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Disabled', exact: true })).toBeDisabled();
});

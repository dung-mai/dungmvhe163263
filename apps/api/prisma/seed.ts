import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const image = (name: string) => `/images/products/${name}`;
const categories = [
  ['smartphones', 'Điện thoại', 'galaxy.webp'],
  ['headphones', 'Tai nghe', 'bose.webp'],
  ['tv', 'TV & Màn hình', 'monitor.svg'],
  ['laptops', 'Laptop', 'rog.webp'],
  ['personal-care', 'Chăm sóc cá nhân', 'dryer.svg'],
  ['home-appliances', 'Gia dụng', 'blender.svg'],
  ['speakers', 'Loa thông minh', 'speaker.svg'],
];
const catalog: [string, string, string, string, string, number, number, string?][] = [
  [
    'xiaomi-monitor-a24i',
    'Xiaomi Monitor A24i 24 inch FHD IPS 100Hz',
    'Xiaomi',
    'tv',
    'monitor.svg',
    2590000,
    2990000,
    'Đáng mua',
  ],
  [
    'samsung-galaxy-tab',
    'Samsung Galaxy Tab S9 FE 8GB/128GB Bạc',
    'Samsung',
    'smartphones',
    'tablet.svg',
    7990000,
    0,
  ],
  [
    'samsung-galaxy-s23',
    'Samsung Galaxy S23 256GB Tím Lavender',
    'Samsung',
    'smartphones',
    'galaxy.webp',
    14990000,
    18990000,
    'Mới',
  ],
  [
    'philips-hair-dryer',
    'Máy sấy tóc Philips Series 5000 2300W',
    'Philips',
    'personal-care',
    'dryer.svg',
    890000,
    1090000,
  ],
  [
    'garmin-forerunner',
    'Đồng hồ Garmin Forerunner 255 Đen',
    'Garmin',
    'personal-care',
    'watch.webp',
    4990000,
    6490000,
    'Giá sốc',
  ],
  [
    'delonghi-coffee',
    'Máy pha cà phê DeLonghi Magnifica Evo',
    'DeLonghi',
    'home-appliances',
    'coffee.svg',
    15990000,
    0,
  ],
  [
    'bose-quietcomfort',
    'Tai nghe Bose QuietComfort Ultra Wireless',
    'Bose',
    'headphones',
    'bose.webp',
    6990000,
    8490000,
    'Mới',
  ],
  [
    'sony-wf1000xm5',
    'Tai nghe Sony WF-1000XM5 Chống ồn Đen',
    'Sony',
    'headphones',
    'sony.webp',
    4990000,
    6490000,
  ],
  [
    'projector-magcubic',
    'Máy chiếu mini Magcubic HY300 Full HD',
    'Magcubic',
    'tv',
    'projector.webp',
    1290000,
    1590000,
  ],
  [
    'samsung-galaxy-ultra',
    'Samsung Galaxy S23 Ultra 512GB Tím',
    'Samsung',
    'smartphones',
    'galaxy.webp',
    22990000,
    26990000,
    'Đáng mua',
  ],
  [
    'canon-eos-r5',
    'Máy ảnh Canon EOS R5 Mirrorless Body',
    'Canon',
    'personal-care',
    'camera.webp',
    79990000,
    0,
    'Đáng mua',
  ],
  [
    'playstation-5',
    'Máy chơi game Sony PlayStation 5 Digital',
    'Sony',
    'home-appliances',
    'playstation.webp',
    10990000,
    0,
  ],
  [
    'apple-airpods-pro',
    'Apple AirPods Pro 2 USB-C Chính hãng',
    'Apple',
    'headphones',
    'airpods-pro.webp',
    4990000,
    5990000,
  ],
  [
    'macbook-pro-14',
    'Apple MacBook Pro 14 inch M3 16GB 512GB',
    'Apple',
    'laptops',
    'macbook.webp',
    35990000,
    0,
  ],
  [
    'garmin-venu',
    'Đồng hồ thông minh Garmin Venu 3 GPS',
    'Garmin',
    'personal-care',
    'watch.webp',
    8990000,
    10990000,
  ],
  [
    'canon-camera-kit',
    'Canon EOS R5 & Lens RF 24-105mm Kit',
    'Canon',
    'personal-care',
    'camera.webp',
    89990000,
    99990000,
  ],
  [
    'blender-pro',
    'Máy xay sinh tố Philips ProBlend 1000W',
    'Philips',
    'home-appliances',
    'blender.svg',
    1590000,
    2190000,
    'Giá sốc',
  ],
  [
    'asus-rog-zephyrus',
    'Laptop ASUS ROG Zephyrus G16 RTX 4060',
    'ASUS',
    'laptops',
    'rog.webp',
    32990000,
    36990000,
    'Giá sốc',
  ],
  [
    'sony-dualsense',
    'Sony PlayStation 5 Slim Digital 1TB',
    'Sony',
    'home-appliances',
    'playstation.webp',
    9990000,
    11990000,
    'Giá sốc',
  ],
  [
    'sony-linkbuds',
    'Tai nghe Sony LinkBuds S Đen',
    'Sony',
    'headphones',
    'sony.webp',
    2490000,
    3490000,
    'Giá sốc',
  ],
  [
    'macbook-air-m2',
    'Apple MacBook Air M2 13 inch 8GB 256GB',
    'Apple',
    'laptops',
    'macbook.webp',
    18990000,
    22990000,
    'Giá sốc',
  ],
  [
    'apple-airpods-3',
    'Apple AirPods 3 Lightning Trắng',
    'Apple',
    'headphones',
    'airpods-case.webp',
    3290000,
    3990000,
  ],
  [
    'speaker-home-mini',
    'Loa thông minh Home Mini Wi-Fi Đen',
    'Flashlab',
    'speakers',
    'speaker.svg',
    1290000,
    1590000,
  ],
  [
    'samsung-monitor-27',
    'Màn hình Samsung Essential 27 inch IPS',
    'Samsung',
    'tv',
    'monitor.svg',
    3290000,
    3990000,
  ],
  [
    'galaxy-tab-fe',
    'Samsung Galaxy Tab S9 FE WiFi 128GB',
    'Samsung',
    'smartphones',
    'tablet.svg',
    7990000,
    8990000,
  ],
  [
    'bose-headphones-blue',
    'Bose QuietComfort Wireless Midnight Blue',
    'Bose',
    'headphones',
    'bose.webp',
    5990000,
    0,
  ],
  [
    'apple-airpods-4',
    'Apple AirPods 4 Chống ồn chủ động',
    'Apple',
    'headphones',
    'airpods.webp',
    4290000,
    0,
    'Mới',
  ],
  [
    'philips-dryer-compact',
    'Máy sấy tóc Philips Compact 1600W',
    'Philips',
    'personal-care',
    'dryer.svg',
    490000,
    690000,
  ],
  [
    'mini-projector-pro',
    'Máy chiếu thông minh Mini Pro 4K WiFi',
    'Magcubic',
    'tv',
    'projector.webp',
    2290000,
    2990000,
  ],
  [
    'coffee-mini',
    'Máy pha cà phê DeLonghi Dedica Style',
    'DeLonghi',
    'home-appliances',
    'coffee.svg',
    5990000,
    6990000,
  ],
  [
    'asus-rog-strix',
    'Laptop ASUS ROG Strix G16 16GB 1TB',
    'ASUS',
    'laptops',
    'rog.webp',
    39990000,
    45990000,
  ],
  [
    'smart-speaker-pro',
    'Loa thông minh Home Sound Pro',
    'Flashlab',
    'speakers',
    'speaker.svg',
    2490000,
    2990000,
  ],
  [
    'airpods-unavailable',
    'Apple AirPods Pro 2 Lightning (Hết hàng)',
    'Apple',
    'headphones',
    'airpods-detail.webp',
    4590000,
    0,
  ],
  [
    'draft-product',
    'Sản phẩm nội bộ chưa công bố',
    'Flashlab',
    'speakers',
    'speaker.svg',
    1000000,
    0,
  ],
];
async function seed() {
  await prisma.$transaction(
    async (tx) => {
      for (const [position, c] of categories.entries()) {
        const [slug, name, file] = c;
        await tx.category.upsert({
          where: { slug },
          create: { id: slug, slug, name, image: image(file), position },
          update: { name, image: image(file), position },
        });
      }
      for (const [index, p] of catalog.entries()) {
        const [slug, name, brand, category, file, price, original, badge] = p;
        await tx.brand.upsert({
          where: { slug: brand.toLowerCase() },
          create: { id: brand.toLowerCase(), slug: brand.toLowerCase(), name: brand },
          update: { name: brand },
        });
        const data = {
          name,
          description: `${name}. Sản phẩm điện tử được chọn lọc tại Flashlab. Thông số, giá và đánh giá trong bản demo chỉ mang tính minh họa.`,
          status: slug === 'draft-product' ? ('DRAFT' as const) : ('ACTIVE' as const),
          brandId: brand.toLowerCase(),
          categoryId: category,
          badge: badge ?? null,
          rating: Number((4.3 + (index % 7) / 10).toFixed(1)),
          reviewCount: 29 + index * 17,
        };
        await tx.product.upsert({
          where: { slug },
          create: { id: slug, slug, ...data, createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)) },
          update: data,
        });
        await tx.productVariant.upsert({
          where: { sku: `FL-${slug}` },
          create: {
            id: `v-${slug}`,
            sku: `FL-${slug}`,
            name: 'Tiêu chuẩn',
            productId: slug,
            price,
            originalPrice: original || null,
            isDefault: true,
            available: slug !== 'airpods-unavailable',
          },
          update: {
            price,
            originalPrice: original || null,
            available: slug !== 'airpods-unavailable',
          },
        });
        await tx.productImage.upsert({
          where: { productId_position: { productId: slug, position: 0 } },
          create: { productId: slug, position: 0, url: image(file) },
          update: { url: image(file) },
        });
      }
      for (const [slug, name, start, end] of [
        ['best-sellers', 'Bán chạy nhất', 0, 6],
        ['new-in', 'Mới lên kệ', 6, 15],
        ['top-sales', 'Flash sale', 16, 21],
      ] as const) {
        await tx.collection.upsert({
          where: { slug },
          create: { id: slug, slug, name },
          update: { name },
        });
        await tx.collectionProduct.deleteMany({ where: { collectionId: slug } });
        for (const [position, product] of catalog.slice(start, end).entries())
          await tx.collectionProduct.create({
            data: { collectionId: slug, productId: product[0], position },
          });
      }
      const banners = [
        {
          id: 'hero-1',
          title: 'Khám phá thế hệ\nGalaxy mới.',
          subtitle: 'Công nghệ đỉnh cao. Trải nghiệm khác biệt.',
          label: 'SAMSUNG GALAXY',
          image: '/images/hero-phones.svg',
          theme: 'sunset',
          collectionSlug: 'best-sellers',
          position: 0,
        },
        {
          id: 'hero-2',
          title: 'Âm thanh hay.\nMọi khoảnh khắc.',
          subtitle: 'Khám phá thế giới tai nghe không dây.',
          label: 'SOUND ON. WORLD OFF.',
          image: '/images/products/bose.webp',
          theme: 'ocean',
          collectionSlug: 'new-in',
          position: 1,
        },
        {
          id: 'hero-3',
          title: 'Hiệu năng mới.\nCảm hứng mới.',
          subtitle: 'Laptop cho những ý tưởng không giới hạn.',
          label: 'WORK. CREATE. PLAY.',
          image: '/images/products/rog.webp',
          theme: 'violet',
          collectionSlug: 'top-sales',
          position: 2,
        },
      ];
      for (const b of banners)
        await tx.banner.upsert({ where: { id: b.id }, create: b, update: b });
      const existing = await tx.flashSale.findUnique({ where: { id: 'daily-flash' } });
      // Keep a running campaign stable on repeated seed; renew only after expiration.
      const dates =
        existing && existing.endsAt > new Date()
          ? {}
          : {
              startsAt: new Date(Date.now() - 3600000),
              endsAt: new Date(Date.now() + 48 * 3600000),
            };
      await tx.flashSale.upsert({
        where: { id: 'daily-flash' },
        create: {
          id: 'daily-flash',
          title: 'Flash sale mỗi ngày',
          startsAt: new Date(Date.now() - 3600000),
          endsAt: new Date(Date.now() + 48 * 3600000),
        },
        update: dates,
      });
      for (const p of catalog.slice(16, 21))
        await tx.flashSaleItem.upsert({
          where: { saleId_variantId: { saleId: 'daily-flash', variantId: `v-${p[0]}` } },
          create: {
            saleId: 'daily-flash',
            variantId: `v-${p[0]}`,
            price: Math.floor((p[5] * 0.9) / 1000) * 1000,
          },
          update: { price: Math.floor((p[5] * 0.9) / 1000) * 1000 },
        });
    },
    { timeout: 30000 },
  );
  console.log(
    `Seeded ${catalog.length} products, ${categories.length} categories, 3 collections and a demo flash sale.`,
  );
}
seed().finally(() => prisma.$disconnect());

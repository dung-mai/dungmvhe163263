import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Product } from '@flashlab/contracts';
import type { CatalogQuery, CatalogRepository } from '../domain/catalog.repository';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { effectivePrice } from '../../promotions/domain/sale';
const include = {
  brand: true,
  category: true,
  images: { orderBy: { position: 'asc' as const } },
  variants: {
    orderBy: [{ isDefault: 'desc' as const }, { sku: 'asc' as const }],
    include: { sales: { include: { sale: true } } },
  },
} satisfies Prisma.ProductInclude;
type RecordProduct = Prisma.ProductGetPayload<{ include: typeof include }>;
export function mapProduct(record: RecordProduct, now: Date): Product {
  const variant = record.variants[0];
  const base = variant?.price.toFixed(0) ?? '0';
  const applicable = variant?.sales
    .filter((s) => s.sale.startsAt <= now && s.sale.endsAt > now)
    .sort((a, b) => a.price.comparedTo(b.price))[0];
  const price = effectivePrice(
    base,
    applicable
      ? {
          price: applicable.price.toFixed(0),
          startsAt: applicable.sale.startsAt,
          endsAt: applicable.sale.endsAt,
        }
      : undefined,
    now,
  );
  const compare = variant?.originalPrice?.toFixed(0) ?? base;
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    brand: record.brand.name,
    category: record.category.slug,
    image: record.images[0]?.url ?? '/images/products/galaxy.webp',
    images: record.images.map((i) => i.url),
    price,
    originalPrice: BigInt(compare) > BigInt(price) ? compare : null,
    currency: 'VND',
    rating: record.rating,
    reviewCount: record.reviewCount,
    badge: record.badge,
    available: variant?.available ?? false,
  };
}
@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: CatalogQuery) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      variants: { some: {} },
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { brand: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.collection
        ? { collections: { some: { collection: { slug: query.collection } } } }
        : {}),
    };
    let records: RecordProduct[];
    let total: number;
    if (query.collection) {
      const relationWhere: Prisma.CollectionProductWhereInput = {
        collection: { slug: query.collection },
        product: where,
      };
      const [links, count] = await this.prisma.$transaction(
        async (tx) => {
          const links = await tx.collectionProduct.findMany({
            where: relationWhere,
            include: { product: { include } },
            orderBy: [{ position: 'asc' }, { productId: 'asc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          });
          const count = await tx.collectionProduct.count({ where: relationWhere });
          return [links, count] as const;
        },
        { isolationLevel: 'RepeatableRead' },
      );
      records = links.map((link) => link.product);
      total = count;
    } else {
      [records, total] = await this.prisma.$transaction(
        async (tx) => {
          const records = await tx.product.findMany({
            where,
            include,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          });
          const total = await tx.product.count({ where });
          return [records, total];
        },
        { isolationLevel: 'RepeatableRead' },
      );
    }
    const now = new Date();
    return {
      items: records.map((p) => mapProduct(p, now)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async findBySlug(slug: string) {
    const record = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE', variants: { some: {} } },
      include,
    });
    return record ? mapProduct(record, new Date()) : null;
  }
  categories() {
    return this.prisma.category.findMany({
      select: { slug: true, name: true, image: true },
      orderBy: [{ position: 'asc' }, { slug: 'asc' }],
    });
  }
}

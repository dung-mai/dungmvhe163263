import type { HomeData } from '@flashlab/contracts';
import type { ListCategories, ListProducts } from '../../catalog/application/catalog.use-cases';
import type { HomeContentRepository } from '../domain/home-content.repository';
export class GetHome {
  constructor(
    private readonly products: ListProducts,
    private readonly categories: ListCategories,
    private readonly content: HomeContentRepository,
  ) {}
  async execute(): Promise<HomeData> {
    const now = new Date();
    const [categories, banners, best, arrivals, sales, flashSale] = await Promise.all([
      this.categories.execute(),
      this.content.banners(),
      this.products.execute({ page: 1, limit: 6, collection: 'best-sellers' }),
      this.products.execute({ page: 1, limit: 9, collection: 'new-in' }),
      this.products.execute({ page: 1, limit: 5, collection: 'top-sales' }),
      this.content.flashSale(now),
    ]);
    return {
      serverTime: now.toISOString(),
      categories,
      banners,
      bestSellers: best.items,
      newArrivals: arrivals.items,
      topSales: sales.items,
      flashSale,
    };
  }
}

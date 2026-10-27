import type { CatalogQuery, CatalogRepository } from '../domain/catalog.repository';
import { ProductNotFoundError } from '../domain/catalog.repository';
export class ListProducts {
  constructor(private readonly repository: CatalogRepository) {}
  execute(query: CatalogQuery) {
    return this.repository.list(query);
  }
}
export class GetProduct {
  constructor(private readonly repository: CatalogRepository) {}
  async execute(slug: string) {
    const product = await this.repository.findBySlug(slug);
    if (!product) throw new ProductNotFoundError();
    return product;
  }
}
export class ListCategories {
  constructor(private readonly repository: CatalogRepository) {}
  execute() {
    return this.repository.categories();
  }
}

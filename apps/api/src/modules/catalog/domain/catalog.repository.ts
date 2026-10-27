import type { Category, Product, ProductPage } from '@flashlab/contracts';
export interface CatalogQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  collection?: string;
}
export interface CatalogRepository {
  list(query: CatalogQuery): Promise<ProductPage>;
  findBySlug(slug: string): Promise<Product | null>;
  categories(): Promise<Category[]>;
}
export const CATALOG_REPOSITORY = Symbol('CatalogRepository');
export class ProductNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy sản phẩm');
  }
}

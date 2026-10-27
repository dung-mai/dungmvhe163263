import { Module } from '@nestjs/common';
import { CATALOG_REPOSITORY, type CatalogRepository } from './domain/catalog.repository';
import { GetProduct, ListCategories, ListProducts } from './application/catalog.use-cases';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository';
import { CatalogController } from './presentation/catalog.controller';
@Module({
  controllers: [CatalogController],
  providers: [
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    ...[GetProduct, ListCategories, ListProducts].map((useCase) => ({
      provide: useCase,
      inject: [CATALOG_REPOSITORY],
      useFactory: (repository: CatalogRepository) => new useCase(repository),
    })),
  ],
  exports: [ListProducts, ListCategories],
})
export class CatalogModule {}

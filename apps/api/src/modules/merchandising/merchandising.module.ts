import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogModule } from '../catalog/catalog.module';
import { ListCategories, ListProducts } from '../catalog/application/catalog.use-cases';
import { GetHome } from './application/get-home';
import {
  HOME_CONTENT_REPOSITORY,
  type HomeContentRepository,
} from './domain/home-content.repository';
import { PrismaHomeRepository } from './infrastructure/prisma-home.repository';
@ApiTags('Merchandising')
@Controller('home')
class HomeController {
  constructor(private readonly home: GetHome) {}
  @Get() get() {
    return this.home.execute();
  }
}
@Module({
  imports: [CatalogModule],
  controllers: [HomeController],
  providers: [
    { provide: HOME_CONTENT_REPOSITORY, useClass: PrismaHomeRepository },
    {
      provide: GetHome,
      inject: [ListProducts, ListCategories, HOME_CONTENT_REPOSITORY],
      useFactory: (p: ListProducts, c: ListCategories, r: HomeContentRepository) =>
        new GetHome(p, c, r),
    },
  ],
})
export class MerchandisingModule {}

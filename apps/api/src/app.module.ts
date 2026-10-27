import { Controller, Get, Module } from '@nestjs/common';
import { PersistenceModule } from './infrastructure/persistence.module';
import { PrismaService } from './infrastructure/prisma.service';
import { AppLogger } from './infrastructure/app-logger';
import { CatalogModule } from './modules/catalog/catalog.module';
import { MerchandisingModule } from './modules/merchandising/merchandising.module';
@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up' };
  }
}
@Module({
  imports: [PersistenceModule, CatalogModule, MerchandisingModule],
  controllers: [HealthController],
  providers: [AppLogger],
})
export class AppModule {}

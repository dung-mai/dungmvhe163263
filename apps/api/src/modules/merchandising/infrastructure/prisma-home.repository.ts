import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma.service';
import type { HomeContentRepository } from '../domain/home-content.repository';
import { saleStatus } from '../../promotions/domain/sale';
@Injectable()
export class PrismaHomeRepository implements HomeContentRepository {
  constructor(private readonly prisma: PrismaService) {}
  banners() {
    return this.prisma.banner.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }
  async flashSale(now: Date) {
    const sale = await this.prisma.flashSale.findFirst({
      where: { endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
    });
    return sale
      ? {
          id: sale.id,
          title: sale.title,
          startsAt: sale.startsAt.toISOString(),
          endsAt: sale.endsAt.toISOString(),
          status: saleStatus(sale.startsAt, sale.endsAt, now),
        }
      : null;
  }
}

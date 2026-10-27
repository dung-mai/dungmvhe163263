import type { Banner, Sale } from '@flashlab/contracts';
export const HOME_CONTENT_REPOSITORY = Symbol('HomeContentRepository');
export interface HomeContentRepository {
  banners(): Promise<Banner[]>;
  flashSale(now: Date): Promise<Sale | null>;
}

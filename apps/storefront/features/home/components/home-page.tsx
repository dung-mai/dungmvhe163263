'use client';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { HomeData } from '@flashlab/contracts';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { StorePanels } from '@/components/layout/store-panels';
import { AccountPreview } from '@/components/layout/account-preview';
import { CatalogPanel, type CatalogSelection } from '@/components/catalog/catalog-panel';
import { HeroCarousel } from '@/components/merchandising/hero-carousel';
import { Countdown } from '@/components/merchandising/countdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Benefits,
  BlogSection,
  CampaignBanner,
  Categories,
  NewArrivals,
  ProductSection,
  FlashSaleTitle,
} from './home-sections';
export function HomePage({ data }: { data: HomeData }) {
  const [catalog, setCatalog] = useState<CatalogSelection | null>(null);
  const [panel, setPanel] = useState<'cart' | 'wishlist' | null>(null);
  const [account, setAccount] = useState(false);
  const [info, setInfo] = useState('');
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const refreshSale = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);
  return (
    <div className="storefront-shell">
      <SiteHeader
        categories={data.categories}
        onCatalog={setCatalog}
        onPanel={setPanel}
        onAccount={() => setAccount(true)}
        onInfo={setInfo}
      />
      <main className="content-container home-main" id="main-content">
        <HeroCarousel banners={data.banners} onCatalog={setCatalog} />
        <Categories categories={data.categories} onCatalog={setCatalog} />
        <ProductSection
          title="Bán chạy nhất"
          products={data.bestSellers}
          onView={() => setCatalog({ title: 'Bán chạy nhất', collection: 'best-sellers' })}
        />
        <NewArrivals products={data.newArrivals} onCatalog={setCatalog} />
        <CampaignBanner onCatalog={setCatalog} />
        <ProductSection
          id="flash-sale"
          title="Flash sale"
          products={refreshing ? [] : data.topSales}
          columns={5}
          onView={() => setCatalog({ title: 'Flash sale', collection: 'top-sales' })}
        >
          <FlashSaleTitle />
          {data.flashSale && (
            <Countdown sale={data.flashSale} serverTime={data.serverTime} onExpired={refreshSale} />
          )}
        </ProductSection>
        <BlogSection onInfo={setInfo} />
        <Benefits onInfo={setInfo} />
      </main>
      <SiteFooter onInfo={setInfo} />
      <CatalogPanel selection={catalog} onClose={() => setCatalog(null)} />
      <StorePanels panel={panel} onClose={() => setPanel(null)} />
      <AccountPreview open={account} onClose={() => setAccount(false)} />
      <Dialog
        open={!!info}
        onOpenChange={(open) => {
          if (!open) setInfo('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin Flashlab</DialogTitle>
            <DialogDescription className="pt-3 leading-6">{info}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

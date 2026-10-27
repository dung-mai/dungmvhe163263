'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Banner } from '@flashlab/contracts';
import type { CatalogSelection } from '@/components/catalog/catalog-panel';
export function HeroCarousel({
  banners,
  onCatalog,
}: {
  banners: Banner[];
  onCatalog: (s: CatalogSelection) => void;
}) {
  const [ref, api] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = useState(0);
  const select = useCallback(() => {
    if (api) setSelected(api.selectedScrollSnap());
  }, [api]);
  useEffect(() => {
    if (!api) return;
    select();
    api.on('select', select);
    return () => {
      api.off('select', select);
    };
  }, [api, select]);
  return (
    <section className="hero-section" aria-label="Ưu đãi nổi bật">
      <div className="hero-viewport" ref={ref}>
        <div className="hero-track">
          {banners.map((b, i) => (
            <div className="hero-slide" key={b.id}>
              <div className={`hero-banner theme-${b.theme}`}>
                <div className="hero-copy">
                  <p>{b.label}</p>
                  <h1>
                    {b.title.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </h1>
                  <span className="hero-subtitle">{b.subtitle}</span>
                  <button
                    onClick={() => onCatalog({ title: b.label, collection: b.collectionSlug })}
                  >
                    Khám phá ngay
                  </button>
                </div>
                <Image
                  src={b.image}
                  alt={b.label}
                  width={760}
                  height={600}
                  priority={i === 0}
                  className="hero-product"
                  unoptimized={b.image.endsWith('.svg')}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hero-controls">
        <button onClick={() => api?.scrollPrev()} aria-label="Banner trước">
          <ArrowLeft size={15} />
        </button>
        <div className="carousel-dots">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => api?.scrollTo(i)}
              className={selected === i ? 'active' : ''}
              aria-label={`Xem banner ${i + 1}`}
              aria-current={selected === i}
            />
          ))}
        </div>
        <button onClick={() => api?.scrollNext()} aria-label="Banner tiếp theo">
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

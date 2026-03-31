'use client';

import { Skeleton } from 'antd';

export function SideCardSkeleton() {
  return (
    <section className="side-card">
      <Skeleton active paragraph={{ rows: 3 }} title={{ width: '42%' }} />
    </section>
  );
}

export function RecipientRowsSkeleton({ rows = 3 }) {
  return (
    <div className="recipient-rows">
      {Array.from({ length: rows }).map((_, index) => (
        <article key={`recipient-skeleton-${index}`} className="recipient-row recipient-row-skeleton">
          <div className="recipient-row-head">
            <div className="recipient-row-meta">
              <Skeleton.Avatar active size={56} shape="circle" />
              <div className="recipient-row-copy">
                <Skeleton active title={{ width: '44%' }} paragraph={{ rows: 1, width: ['36%'] }} />
              </div>
            </div>
            <div className="recipient-row-actions">
              <Skeleton.Button active size="small" shape="round" />
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
            </div>
          </div>

          <div className="recipient-scroll-track recipient-scroll-track-skeleton">
            {Array.from({ length: 5 }).map((__, cardIndex) => (
              <div key={`recipient-card-skeleton-${index}-${cardIndex}`} className="recipient-scroll-card">
                <div className="gift-card-art gift-card-art-skeleton">
                  <Skeleton.Image active className="gift-card-image-skeleton" />
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function TemplateGridSkeleton({ count = 6 }) {
  return (
    <section className="template-rail">
      {Array.from({ length: count }).map((_, index) => (
        <article key={`template-skeleton-${index}`} className="template-card">
          <div className="template-cover template-cover-skeleton">
            <Skeleton.Image active className="template-image-skeleton" />
          </div>
          <div className="template-copy">
            <Skeleton active paragraph={{ rows: 2 }} title={{ width: '58%' }} />
          </div>
        </article>
      ))}
    </section>
  );
}

export function CardsGridSkeleton({ count = 6 }) {
  return (
    <div className="cards-grid cards-grid-mobile-2">
      {Array.from({ length: count }).map((_, index) => (
        <article key={`card-grid-skeleton-${index}`} className="gift-card">
          <div className="gift-card-art gift-card-art-skeleton">
            <Skeleton.Image active className="gift-card-image-skeleton" />
          </div>
        </article>
      ))}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const safeImages = useMemo(() => (images.length > 0 ? images : []), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (safeImages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
        <img src={safeImages[activeIndex]} alt={productName} className="h-full w-full object-cover" />
      </div>

      {safeImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {safeImages.slice(0, 8).map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${productName}-thumb-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`aspect-square overflow-hidden rounded-xl bg-stone-100 ring-offset-2 transition ${
                  isActive ? "ring-2 ring-stone-900" : "hover:ring-2 hover:ring-stone-300"
                }`}
                aria-label={`Xem ảnh ${idx + 1} của ${productName}`}
                aria-pressed={isActive}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
                <img src={img} alt={`${productName} ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

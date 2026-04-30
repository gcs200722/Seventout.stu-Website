"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type CmsHotspot = { x: number; y: number; product_id: string };

export function CmsShopTheLookHotspots({
  image,
  hotspots,
  productLinks,
}: {
  image: string;
  hotspots: CmsHotspot[];
  productLinks: Record<string, string>;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="relative w-full overflow-hidden bg-sevenout-black">
      <div className="relative mx-auto max-w-6xl">
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]">
          <Image src={image} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 1200px" priority />
          {hotspots.map((h, idx) => {
            const href = productLinks[h.product_id] ?? `/products`;
            const left = `${h.x * 100}%`;
            const top = `${h.y * 100}%`;
            const isOpen = open === idx;
            return (
              <div
                key={`${h.product_id}-${idx}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left, top }}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label="Điểm nổi sản phẩm"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-black/40 text-xs font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60"
                >
                  +
                </button>
                {isOpen ? (
                  <div className="absolute left-1/2 top-full z-10 mt-2 w-44 -translate-x-1/2 rounded-xl border border-white/20 bg-black/80 p-3 text-center text-xs text-white shadow-xl backdrop-blur-md">
                    <Link href={href} className="font-semibold underline-offset-4 hover:underline">
                      Xem sản phẩm
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

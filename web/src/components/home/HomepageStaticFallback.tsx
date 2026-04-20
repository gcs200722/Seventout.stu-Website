import { BrandStorySection } from "@/components/home/BrandStorySection";
import { EditorialFeaturedCollections } from "@/components/home/EditorialFeaturedCollections";
import { HeroBanner } from "@/components/home/HeroBanner";
import { LookbookGrid } from "@/components/home/LookbookGrid";
import { ProductSection } from "@/components/home/ProductSection";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import { Reveal } from "@/components/home/Reveal";
import {
  bestSellingProducts,
  brandStoryContent,
  heroContent,
  lookbookImages,
  newArrivals,
  promotion,
} from "@/data/home-merchandising";
import { featuredCollectionsFromApi } from "@/lib/categories-api";

/** Fallback when CMS API is unavailable or returns nothing. */
export async function HomepageStaticFallback() {
  const featuredCollections = await featuredCollectionsFromApi();

  return (
    <>
      <HeroBanner {...heroContent} />

      <Reveal>
        <BrandStorySection {...brandStoryContent} />
      </Reveal>

      <Reveal>
        <LookbookGrid images={lookbookImages} />
      </Reveal>

      <Reveal>
        <section className="w-full bg-sevenout-white px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-sevenout-serif text-3xl font-semibold tracking-wide text-sevenout-black sm:text-4xl">
                Featured Collections
              </h2>
              <p className="mt-3 text-sm leading-relaxed tracking-wide text-neutral-600 sm:text-base">
                Bộ sưu tập theo mood — hover để xem tên và điều hướng.
              </p>
            </div>
            {featuredCollections.length === 0 ? (
              <p className="rounded-2xl border border-neutral-200 bg-sevenout-muted p-8 text-sm text-neutral-600">
                Chưa có danh mục trên hệ thống. Vui lòng quản trị viên thêm danh mục (level 1) để hiển thị tại
                đây.
              </p>
            ) : (
              <EditorialFeaturedCollections collections={featuredCollections} />
            )}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <ProductSection
          id="best-selling"
          title="Best Selling"
          subtitle="Những món được chọn nhiều — thông tin giá và CTA chỉ hiện khi bạn hover."
          products={bestSellingProducts}
          cardVariant="editorial"
          viewMoreHref="/products"
          viewMoreLabel="Xem tất cả sản phẩm"
        />
      </Reveal>

      <Reveal>
        <ProductSection
          title="New Arrivals"
          subtitle="Drop mới — số lượng giới hạn, cập nhật thường xuyên."
          products={newArrivals}
          cardVariant="editorial"
          viewMoreHref="/products"
          viewMoreLabel="Xem tất cả sản phẩm"
        />
      </Reveal>

      <Reveal>
        <PromotionBanner {...promotion} />
      </Reveal>
    </>
  );
}

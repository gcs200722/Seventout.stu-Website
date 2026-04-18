import { CollectionCard } from "@/components/home/CollectionCard";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductSection } from "@/components/home/ProductSection";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import {
  bestSellingProducts,
  heroContent,
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

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Featured Collections
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Những bộ sưu tập nổi bật theo cảm hứng local streetwear.
            </p>
          </div>
        </div>
        {featuredCollections.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            Chưa có danh mục trên hệ thống. Vui lòng quản trị viên thêm danh mục (level 1) để hiển thị tại
            đây.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featuredCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        )}
      </section>

      <ProductSection
        id="best-selling"
        title="Best Selling Products"
        subtitle="Các sản phẩm bán chạy nhất tuần này."
        products={bestSellingProducts}
      />

      <ProductSection
        title="New Arrivals"
        subtitle="Drop mới cập nhật mỗi tuần, số lượng giới hạn."
        products={newArrivals}
      />

      <PromotionBanner {...promotion} />
    </>
  );
}

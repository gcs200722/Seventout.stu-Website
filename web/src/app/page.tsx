import { CollectionCard } from "@/components/home/CollectionCard";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductSection } from "@/components/home/ProductSection";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import {
  bestSellingProducts,
  collections,
  heroContent,
  newArrivals,
  promotion,
} from "@/data/home";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="flex-1">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
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
      </main>
      <Footer />
    </div>
  );
}

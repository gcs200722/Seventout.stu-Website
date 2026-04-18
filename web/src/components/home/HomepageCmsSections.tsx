import type { ReactNode } from "react";
import { CollectionCard } from "@/components/home/CollectionCard";
import { HeroBanner } from "@/components/home/HeroBanner";
import type { Product } from "@/components/home/ProductCard";
import { ProductSection } from "@/components/home/ProductSection";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import type { CmsPublishedPage, CmsPublishedSection } from "@/lib/cms-api";
import { featuredCollectionsFromApi } from "@/lib/categories-api";
import type { ProductDetail } from "@/lib/products-api";
import { getProductByIdPublic } from "@/lib/products-api";

function firstBlock<T extends string>(section: CmsPublishedSection, type: T) {
  return section.blocks.find((b) => b.type === type && b.is_active);
}

async function loadProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const unique = [...new Set(ids)].filter((id) => id && id.length > 0);
  const map = new Map<string, Product>();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const p: ProductDetail = await getProductByIdPublic(id);
        const image = p.images[0] ?? "";
        map.set(id, {
          id: p.id,
          name: p.name,
          price: p.price,
          image,
          promotion: p.promotion,
        });
      } catch {
        /* skip missing products */
      }
    }),
  );
  return map;
}

export async function HomepageCmsSections({ page }: { page: CmsPublishedPage }) {
  const sections = [...page.sections].sort((a, b) => a.sort_order - b.sort_order);

  const allProductIds: string[] = [];
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type !== "PRODUCT" || !block.is_active) continue;
      const raw = block.data.product_ids;
      if (Array.isArray(raw)) {
        for (const id of raw) {
          if (typeof id === "string") allProductIds.push(id);
        }
      }
    }
  }
  const productMap = await loadProductsByIds(allProductIds);

  const elements: ReactNode[] = [];

  for (const section of sections) {
    if (!section.is_active) continue;

    switch (section.type) {
      case "HERO": {
        const banner = firstBlock(section, "BANNER");
        if (banner) {
          const d = banner.data;
          const imageUrl = typeof d.image_url === "string" ? d.image_url : "";
          const title = typeof d.title === "string" ? d.title : "";
          const subtitle = typeof d.subtitle === "string" ? d.subtitle : "";
          const ctaLabel = typeof d.cta_text === "string" ? d.cta_text : "Shop";
          const ctaHref = typeof d.cta_link === "string" ? d.cta_link : "/collections";
          if (title) {
            elements.push(
              <HeroBanner
                key={section.id}
                title={title}
                subtitle={subtitle}
                ctaLabel={ctaLabel}
                ctaHref={ctaHref || "/collections"}
                image={imageUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80"}
              />,
            );
          }
        }
        break;
      }
      case "FEATURED_COLLECTIONS": {
        const featuredCollections = await featuredCollectionsFromApi();
        elements.push(
          <section
            key={section.id}
            className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
          >
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                  {section.title || "Featured Collections"}
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  Những bộ sưu tập nổi bật theo cảm hứng local streetwear.
                </p>
              </div>
            </div>
            {featuredCollections.length === 0 ? (
              <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
                Chưa có danh mục trên hệ thống. Vui lòng quản trị viên thêm danh mục (level 1) để hiển thị
                tại đây.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {featuredCollections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            )}
          </section>,
        );
        break;
      }
      case "PRODUCT_CAROUSEL": {
        const block = firstBlock(section, "PRODUCT");
        const rawIds = block && Array.isArray(block.data.product_ids) ? block.data.product_ids : [];
        const ids = rawIds.filter((id): id is string => typeof id === "string");
        const products = ids
          .map((id) => productMap.get(id))
          .filter((p): p is Product => Boolean(p));
        const blockTitle =
          block && typeof block.data.title === "string" && block.data.title.trim().length > 0
            ? block.data.title
            : section.title;
        const subtitle =
          products.length === 0
            ? "Chưa có sản phẩm được gán cho khu vực này. Vui lòng cập nhật trong CMS."
            : "Sản phẩm được chọn từ catalog.";
        const sectionKey = section.id;
        elements.push(
          <ProductSection
            key={sectionKey}
            id={section.title === "Best Selling Products" ? "best-selling" : undefined}
            title={blockTitle}
            subtitle={subtitle}
            products={products}
          />,
        );
        break;
      }
      case "BANNER": {
        const banner = firstBlock(section, "BANNER");
        if (banner) {
          const d = banner.data;
          const title = typeof d.title === "string" ? d.title : "";
          const description = typeof d.subtitle === "string" ? d.subtitle : "";
          const ctaLabel = typeof d.cta_text === "string" ? d.cta_text : "Shop";
          const ctaHref = typeof d.cta_link === "string" ? d.cta_link : "/collections";
          if (title) {
            elements.push(
              <PromotionBanner
                key={section.id}
                title={title}
                description={description}
                ctaLabel={ctaLabel}
                ctaHref={ctaHref || "/collections"}
              />,
            );
          }
        }
        break;
      }
      case "CATEGORY_GRID": {
        const block = firstBlock(section, "CATEGORY");
        const categories =
          block && Array.isArray(block.data.categories)
            ? (block.data.categories as Array<{ id?: string; name?: string; image?: string }>)
            : [];
        const gridTitle =
          block && typeof block.data.title === "string" && block.data.title.trim().length > 0
            ? block.data.title
            : section.title;
        elements.push(
          <section
            key={section.id}
            className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {gridTitle || "Shop by category"}
              </h2>
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-stone-600">Chưa có danh mục trong block CMS.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {categories.map((c) => (
                  <div
                    key={c.id ?? c.name}
                    className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm"
                  >
                    <p className="font-semibold text-stone-900">{c.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>,
        );
        break;
      }
      default:
        break;
    }
  }

  return <>{elements}</>;
}

import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import type { Collection } from "@/components/home/CollectionCard";
import { BrandStorySection } from "@/components/home/BrandStorySection";
import { CmsJournalRow, type CmsJournalEntry } from "@/components/home/CmsJournalRow";
import { CmsPressMarquee, type CmsMarqueeLogo } from "@/components/home/CmsPressMarquee";
import { CmsQuoteBlock } from "@/components/home/CmsQuoteBlock";
import { CmsRichTextBlock } from "@/components/home/CmsRichTextBlock";
import {
  CmsShopTheLookHotspots,
  type CmsHotspot,
} from "@/components/home/CmsShopTheLookHotspots";
import { CmsVideoBlock } from "@/components/home/CmsVideoBlock";
import { EditorialFeaturedCollections } from "@/components/home/EditorialFeaturedCollections";
import { HeroBanner } from "@/components/home/HeroBanner";
import { LookbookGrid, type LookbookImage } from "@/components/home/LookbookGrid";
import type { Product } from "@/components/home/ProductCard";
import { ProductSection } from "@/components/home/ProductSection";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import { Reveal } from "@/components/home/Reveal";
import { SectionShell } from "@/components/cms/SectionShell";
import {
  mergeBlockExperiment,
  mergeBlockLocale,
  sectionMatchesTargeting,
  themeStyleFromTokens,
} from "@/components/cms/cms-page-helpers";
import type { CmsPublishedPage, CmsPublishedSection } from "@/lib/cms-api";
import { featuredCollectionsFromApi } from "@/lib/categories-api";
import type { ProductDetail } from "@/lib/products-api";
import { getProductsByIdsPublic } from "@/lib/products-api";

const CMS_CATEGORY_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80";

function firstBlock<T extends string>(section: CmsPublishedSection, type: T) {
  return section.blocks.find((b) => b.type === type && b.is_active);
}

function firstEditorialBlock(section: CmsPublishedSection) {
  const kinds = new Set(["VIDEO", "QUOTE", "RICH_TEXT"]);
  const ordered = [...section.blocks].sort((a, b) => a.sort_order - b.sort_order);
  return ordered.find((b) => b.is_active && kinds.has(b.type));
}

function prepBlockData(
  data: Record<string, unknown>,
  locale: string,
  cookieHeader: string | null,
): Record<string, unknown> {
  let out = { ...data };
  out = mergeBlockExperiment(out, cookieHeader);
  out = mergeBlockLocale(out, locale);
  return out;
}

async function loadProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const unique = [...new Set(ids)].filter((id) => id && id.length > 0);
  if (unique.length === 0) {
    return new Map();
  }
  try {
    const list: ProductDetail[] = await getProductsByIdsPublic(unique);
    const map = new Map<string, Product>();
    for (const p of list) {
      const image = p.images[0] ?? "";
      map.set(p.id, {
        id: p.id,
        name: p.name,
        price: p.price,
        image,
        promotion: p.promotion,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

type CmsCategoryRow = { id?: string; name?: string; image?: string; slug?: string };

export type CmsPageRendererProps = {
  page: CmsPublishedPage;
  /** Pass `headers().get("user-agent") ?? ""` from the route for targeting. */
  userAgent?: string;
  /** Pass `headers().get("cookie")` for minimal A/B cookies. */
  cookieHeader?: string | null;
  /** BCP-47-ish locale key for `data.i18n[locale]` (default `vi`). */
  locale?: string;
};

export async function CmsPageRenderer({
  page,
  userAgent = "",
  cookieHeader = null,
  locale = "vi",
}: CmsPageRendererProps) {
  const sections = [...page.sections].sort((a, b) => a.sort_order - b.sort_order);

  const allProductIds: string[] = [];
  for (const section of sections) {
    for (const block of section.blocks) {
      if (!block.is_active) continue;
      if (block.type === "PRODUCT") {
        const raw = block.data.product_ids;
        if (Array.isArray(raw)) {
          for (const id of raw) {
            if (typeof id === "string") {
              allProductIds.push(id);
            }
          }
        }
      }
      if (block.type === "HOTSPOTS") {
        const raw = block.data.hotspots;
        if (Array.isArray(raw)) {
          for (const h of raw) {
            if (h && typeof h === "object" && !Array.isArray(h)) {
              const pid = (h as { product_id?: unknown }).product_id;
              if (typeof pid === "string") {
                allProductIds.push(pid);
              }
            }
          }
        }
      }
    }
  }
  const productMap = await loadProductsByIds(allProductIds);

  const elements: ReactNode[] = [];
  const themeStyle: CSSProperties | undefined =
    page.theme?.tokens && Object.keys(page.theme.tokens).length > 0
      ? themeStyleFromTokens(page.theme.tokens)
      : undefined;

  const wrapTheme = (node: ReactNode) =>
    themeStyle && Object.keys(themeStyle).length > 0 ? (
      <div className="cms-themed-page" style={themeStyle}>
        {node}
      </div>
    ) : (
      node
    );

  for (const section of sections) {
    if (!section.is_active) continue;
    if (!sectionMatchesTargeting(section.targeting, userAgent)) {
      continue;
    }

    const layout =
      section.layout && typeof section.layout === "object" && !Array.isArray(section.layout)
        ? (section.layout as Record<string, unknown>)
        : {};

    switch (section.type) {
      case "HERO": {
        const banner = firstBlock(section, "BANNER");
        if (banner) {
          const d = prepBlockData(banner.data, locale, cookieHeader);
          const imageUrl = typeof d.image_url === "string" ? d.image_url : "";
          const title = typeof d.title === "string" ? d.title : "";
          const subtitle = typeof d.subtitle === "string" ? d.subtitle : "";
          const ctaLabel = typeof d.cta_text === "string" ? d.cta_text : "Shop";
          const ctaHref = typeof d.cta_link === "string" ? d.cta_link : "/collections";
          if (title) {
            elements.push(
              <SectionShell
                key={section.id}
                layout={layout}
                sectionId={section.id}
                sectionType="HERO"
                analyticsBlockId={banner.id}
              >
                <HeroBanner
                  title={title}
                  subtitle={subtitle}
                  ctaLabel={ctaLabel}
                  ctaHref={ctaHref || "/collections"}
                  image={
                    imageUrl ||
                    "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=80"
                  }
                />
              </SectionShell>,
            );
          }
        }
        break;
      }
      case "FEATURED_COLLECTIONS": {
        const featuredCollections = await featuredCollectionsFromApi();
        elements.push(
          <Reveal key={section.id}>
            <SectionShell layout={layout} sectionId={section.id} sectionType={section.type}>
              <section className="w-full bg-sevenout-white px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
                <div className="mx-auto max-w-7xl">
                  <div className="mb-10 max-w-2xl">
                    <h2 className="font-sevenout-serif text-3xl font-semibold tracking-wide text-sevenout-black sm:text-4xl">
                      {section.title || "Featured Collections"}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed tracking-wide text-neutral-600 sm:text-base">
                      Bộ sưu tập theo mood — hover để xem tên và điều hướng.
                    </p>
                  </div>
                  {featuredCollections.length === 0 ? (
                    <p className="rounded-2xl border border-neutral-200 bg-sevenout-muted p-8 text-sm text-neutral-600">
                      Chưa có danh mục trên hệ thống. Vui lòng quản trị viên thêm danh mục (level 1) để hiển thị
                      tại đây.
                    </p>
                  ) : (
                    <EditorialFeaturedCollections collections={featuredCollections} />
                  )}
                </div>
              </section>
            </SectionShell>
          </Reveal>,
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
          <Reveal key={sectionKey}>
            <SectionShell
              layout={layout}
              sectionId={section.id}
              sectionType={section.type}
              analyticsBlockId={block?.id}
            >
              <ProductSection
                id={section.title === "Best Selling Products" ? "best-selling" : undefined}
                title={blockTitle}
                subtitle={subtitle}
                products={products}
                cardVariant="editorial"
                viewMoreHref="/products"
                viewMoreLabel="Xem tất cả sản phẩm"
              />
            </SectionShell>
          </Reveal>,
        );
        break;
      }
      case "BANNER": {
        const banner = firstBlock(section, "BANNER");
        if (banner) {
          const d = prepBlockData(banner.data, locale, cookieHeader);
          const title = typeof d.title === "string" ? d.title : "";
          const description = typeof d.subtitle === "string" ? d.subtitle : "";
          const ctaLabel = typeof d.cta_text === "string" ? d.cta_text : "Shop";
          const ctaHref = typeof d.cta_link === "string" ? d.cta_link : "/collections";
          if (title) {
            elements.push(
              <Reveal key={section.id}>
                <SectionShell
                  layout={layout}
                  sectionId={section.id}
                  sectionType={section.type}
                  analyticsBlockId={banner.id}
                >
                  <PromotionBanner
                    title={title}
                    description={description}
                    ctaLabel={ctaLabel}
                    ctaHref={ctaHref || "/collections"}
                  />
                </SectionShell>
              </Reveal>,
            );
          }
        }
        break;
      }
      case "EDITORIAL": {
        const eb = firstEditorialBlock(section);
        if (eb) {
          const d = prepBlockData(eb.data, locale, cookieHeader);
          if (eb.type === "VIDEO") {
            const srcMp4 = typeof d.src_mp4 === "string" ? d.src_mp4 : "";
            const srcWebm = typeof d.src_webm === "string" ? d.src_webm : "";
            const poster = typeof d.poster === "string" ? d.poster : "";
            const loop = typeof d.loop === "boolean" ? d.loop : true;
            const muted = typeof d.muted === "boolean" ? d.muted : true;
            if (srcMp4.trim() || srcWebm.trim()) {
              elements.push(
                <Reveal key={section.id}>
                  <SectionShell
                    layout={layout}
                    sectionId={section.id}
                    sectionType={section.type}
                    analyticsBlockId={eb.id}
                  >
                    <CmsVideoBlock srcMp4={srcMp4} srcWebm={srcWebm} poster={poster} loop={loop} muted={muted} />
                  </SectionShell>
                </Reveal>,
              );
            }
          } else if (eb.type === "QUOTE") {
            const text = typeof d.text === "string" ? d.text : "";
            const attribution = typeof d.attribution === "string" ? d.attribution : "";
            if (text.trim()) {
              elements.push(
                <Reveal key={section.id}>
                  <SectionShell
                    layout={layout}
                    sectionId={section.id}
                    sectionType={section.type}
                    analyticsBlockId={eb.id}
                  >
                    <div className="w-full bg-sevenout-muted">
                      <CmsQuoteBlock text={text} attribution={attribution} />
                    </div>
                  </SectionShell>
                </Reveal>,
              );
            }
          } else if (eb.type === "RICH_TEXT") {
            const html = typeof d.html === "string" ? d.html : "";
            if (html.trim()) {
              elements.push(
                <Reveal key={section.id}>
                  <SectionShell
                    layout={layout}
                    sectionId={section.id}
                    sectionType={section.type}
                    analyticsBlockId={eb.id}
                  >
                    <div className="w-full bg-sevenout-white">
                      <CmsRichTextBlock html={html} />
                    </div>
                  </SectionShell>
                </Reveal>,
              );
            }
          }
        }
        break;
      }
      case "STORY_CHAPTER": {
        const story = firstBlock(section, "BRAND_STORY");
        if (story) {
          const d = prepBlockData(story.data, locale, cookieHeader);
          const image = typeof d.image === "string" ? d.image : "";
          const line1 = typeof d.line1 === "string" ? d.line1 : "";
          const line2 = typeof d.line2 === "string" ? d.line2 : "";
          if (image && line1) {
            elements.push(
              <Reveal key={section.id}>
                <SectionShell
                  layout={layout}
                  sectionId={section.id}
                  sectionType={section.type}
                  analyticsBlockId={story.id}
                >
                  <BrandStorySection image={image} line1={line1} line2={line2} />
                </SectionShell>
              </Reveal>,
            );
          }
        }
        break;
      }
      case "LOOKBOOK_MOSAIC": {
        const lb = firstBlock(section, "LOOKBOOK");
        if (lb && Array.isArray(lb.data.images) && lb.data.images.length === 3) {
          const d = prepBlockData(lb.data, locale, cookieHeader);
          const raw = d.images as unknown[];
          const tuple: LookbookImage[] = raw.map((item, i) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return { src: "", alt: "" };
            }
            const o = item as Record<string, unknown>;
            const src = typeof o.src === "string" ? o.src : "";
            const alt = typeof o.alt === "string" ? o.alt : `Lookbook ${i + 1}`;
            return { src, alt };
          }) as LookbookImage[];
          if (tuple.every((x) => x.src.trim().length > 0)) {
            const imagesTuple: [LookbookImage, LookbookImage, LookbookImage] = [
              tuple[0],
              tuple[1],
              tuple[2],
            ];
            elements.push(
              <Reveal key={section.id}>
                <SectionShell
                  layout={layout}
                  sectionId={section.id}
                  sectionType={section.type}
                  analyticsBlockId={lb.id}
                >
                  <LookbookGrid images={imagesTuple} />
                </SectionShell>
              </Reveal>,
            );
          }
        }
        break;
      }
      case "SHOP_THE_LOOK": {
        const hb = firstBlock(section, "HOTSPOTS");
        if (hb && Array.isArray(hb.data.hotspots)) {
          const d = prepBlockData(hb.data, locale, cookieHeader);
          const image = typeof d.image === "string" ? d.image : "";
          const rawHs = d.hotspots as unknown[];
          const hotspots: CmsHotspot[] = [];
          for (const raw of rawHs) {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
            const o = raw as Record<string, unknown>;
            const x = typeof o.x === "number" ? o.x : Number(o.x);
            const y = typeof o.y === "number" ? o.y : Number(o.y);
            const product_id = typeof o.product_id === "string" ? o.product_id : "";
            if (
              Number.isFinite(x) &&
              Number.isFinite(y) &&
              product_id &&
              x >= 0 &&
              x <= 1 &&
              y >= 0 &&
              y <= 1
            ) {
              hotspots.push({ x, y, product_id });
            }
          }
          if (image && hotspots.length > 0) {
            const productLinks: Record<string, string> = {};
            for (const h of hotspots) {
              productLinks[h.product_id] = `/products/${h.product_id}`;
            }
            elements.push(
              <Reveal key={section.id}>
                <SectionShell
                  layout={layout}
                  sectionId={section.id}
                  sectionType={section.type}
                  analyticsBlockId={hb.id}
                >
                  <CmsShopTheLookHotspots image={image} hotspots={hotspots} productLinks={productLinks} />
                </SectionShell>
              </Reveal>,
            );
          }
        }
        break;
      }
      case "JOURNAL_ROW": {
        const jb = firstBlock(section, "JOURNAL_LIST");
        if (jb && Array.isArray(jb.data.entries)) {
          const d = prepBlockData(jb.data, locale, cookieHeader);
          const raw = d.entries as unknown[];
          const entries: CmsJournalEntry[] = [];
          for (const item of raw) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const o = item as Record<string, unknown>;
            const title = typeof o.title === "string" ? o.title : "";
            const href = typeof o.href === "string" ? o.href : "";
            const cover = typeof o.cover === "string" ? o.cover : "";
            if (title && href && cover) {
              entries.push({ title, href, cover });
            }
          }
          if (entries.length > 0) {
            elements.push(
              <Reveal key={section.id}>
                <SectionShell
                  layout={layout}
                  sectionId={section.id}
                  sectionType={section.type}
                  analyticsBlockId={jb.id}
                >
                  <CmsJournalRow entries={entries} />
                </SectionShell>
              </Reveal>,
            );
          }
        }
        break;
      }
      case "PRESS_MARQUEE": {
        const mb = firstBlock(section, "MARQUEE_LOGOS");
        if (mb && Array.isArray(mb.data.logos)) {
          const d = prepBlockData(mb.data, locale, cookieHeader);
          const raw = d.logos as unknown[];
          const logos: CmsMarqueeLogo[] = [];
          for (const item of raw) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const o = item as Record<string, unknown>;
            const src = typeof o.src === "string" ? o.src : "";
            const alt = typeof o.alt === "string" ? o.alt : "";
            const href = typeof o.href === "string" ? o.href : "";
            if (src) {
              logos.push({ src, alt, href });
            }
          }
          if (logos.length > 0) {
            elements.push(
              <Reveal key={section.id}>
                <SectionShell
                  layout={layout}
                  sectionId={section.id}
                  sectionType={section.type}
                  analyticsBlockId={mb.id}
                >
                  <CmsPressMarquee logos={logos} />
                </SectionShell>
              </Reveal>,
            );
          }
        }
        break;
      }
      case "CATEGORY_GRID": {
        const block = firstBlock(section, "CATEGORY");
        const blockData = block ? prepBlockData(block.data, locale, cookieHeader) : {};
        const categories =
          block && Array.isArray(blockData.categories)
            ? (blockData.categories as CmsCategoryRow[])
            : [];
        const gridTitle =
          block && typeof blockData.title === "string" && blockData.title.trim().length > 0
            ? blockData.title
            : section.title;
        const mapped: Collection[] = categories.map((c, idx) => {
          const slug =
            typeof c.slug === "string" && c.slug.trim().length > 0 ? `/collections/${c.slug}` : "/collections";
          return {
            id: String(c.id ?? c.name ?? idx),
            title: c.name ?? "Danh mục",
            cta: "Khám phá",
            slug,
            image: typeof c.image === "string" && c.image.trim().length > 0 ? c.image : CMS_CATEGORY_PLACEHOLDER_IMAGE,
          };
        });
        elements.push(
          <Reveal key={section.id}>
            <SectionShell
              layout={layout}
              sectionId={section.id}
              sectionType={section.type}
              analyticsBlockId={block?.id}
            >
              <section className="w-full bg-sevenout-white px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
                <div className="mx-auto max-w-7xl">
                  <div className="mb-10 max-w-2xl">
                    <h2 className="font-sevenout-serif text-3xl font-semibold tracking-wide text-sevenout-black sm:text-4xl">
                      {gridTitle || "Shop by category"}
                    </h2>
                  </div>
                  {categories.length === 0 ? (
                    <p className="text-sm text-neutral-600">Chưa có danh mục trong block CMS.</p>
                  ) : (
                    <EditorialFeaturedCollections collections={mapped} />
                  )}
                </div>
              </section>
            </SectionShell>
          </Reveal>,
        );
        break;
      }
      default:
        break;
    }
  }

  return wrapTheme(<>{elements}</>);
}

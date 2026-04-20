/** Ràng buộc client khớp logic API `cms-block-data.ts` (CmsBlockType). */

export const CMS_BLOCK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CMS_HTML_MAX_LENGTH = 50_000;

export function defaultBlockData(type: string): Record<string, unknown> {
  switch (type) {
    case "BANNER":
      return {
        image_url: "",
        title: "Banner",
        subtitle: "",
        cta_text: "",
        cta_link: "/",
      };
    case "PRODUCT":
      return { title: "", product_ids: [] as string[] };
    case "CATEGORY":
      return { title: "", categories: [] as { id: string; name: string; image: string }[] };
    case "HTML":
      return { html: "<p></p>" };
    case "BRAND_STORY":
      return {
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
        line1: "Câu chuyện thương hiệu",
        line2: "Một dòng phụ tinh tế.",
      };
    case "LOOKBOOK":
      return {
        images: [
          { src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80", alt: "Lookbook 1" },
          { src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80", alt: "Lookbook 2" },
          { src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80", alt: "Lookbook 3" },
        ],
      };
    case "VIDEO":
      return {
        src_mp4: "",
        src_webm: "",
        poster: "",
        loop: true,
        muted: true,
      };
    case "QUOTE":
      return { text: "", attribution: "" };
    case "RICH_TEXT":
      return { html: "<p></p>" };
    case "HOTSPOTS":
      return {
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=80",
        hotspots: [
          { x: 0.35, y: 0.42, product_id: "00000000-0000-4000-8000-000000000001" },
        ],
      };
    case "JOURNAL_LIST":
      return {
        entries: [
          {
            title: "Journal 1",
            href: "/journal/one",
            cover:
              "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
          },
        ],
      };
    case "MARQUEE_LOGOS":
      return {
        logos: [
          {
            src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
            alt: "Partner",
            href: "",
          },
        ],
      };
    default:
      return {};
  }
}

function isAllowedImageOrAssetUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.startsWith("/")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedLink(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.startsWith("/") || t.startsWith("#")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type BlockFormResult =
  | { valid: true; data: Record<string, unknown> }
  | { valid: false; errors: Record<string, string> };

export function validateBlockForm(type: string, raw: Record<string, unknown>): BlockFormResult {
  const errors: Record<string, string> = {};

  switch (type) {
    case "BANNER": {
      const title = String(raw.title ?? "").trim();
      if (!title) {
        errors.title = "Tiêu đề là bắt buộc.";
      }
      const image_url = String(raw.image_url ?? "").trim();
      if (image_url && !isAllowedImageOrAssetUrl(image_url)) {
        errors.image_url = "URL ảnh phải là http(s)://… hoặc đường dẫn bắt đầu bằng /.";
      }
      const subtitle = String(raw.subtitle ?? "").trim();
      const cta_text = String(raw.cta_text ?? "").trim();
      const cta_link = String(raw.cta_link ?? "").trim();
      if (cta_link && !isAllowedLink(cta_link)) {
        errors.cta_link = "Liên kết phải là /đường-dẫn, #anchor hoặc URL http(s).";
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return {
        valid: true,
        data: {
          image_url: image_url,
          title,
          subtitle,
          cta_text,
          cta_link,
        },
      };
    }
    case "PRODUCT": {
      const title = String(raw.title ?? "").trim();
      const idsRaw = raw.product_ids;
      const product_ids: string[] = Array.isArray(idsRaw)
        ? idsRaw.filter((x): x is string => typeof x === "string").map((x) => x.trim())
        : [];
      const invalid = product_ids.filter((id) => !CMS_BLOCK_UUID_RE.test(id));
      if (invalid.length > 0) {
        errors.product_ids = `Có ${invalid.length} mã không đúng định dạng UUID (ví dụ: ${invalid[0]?.slice(0, 12)}…).`;
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { title, product_ids } };
    }
    case "CATEGORY": {
      const title = String(raw.title ?? "").trim();
      const catsRaw = raw.categories;
      if (!Array.isArray(catsRaw)) {
        errors.categories = "Danh sách danh mục không hợp lệ.";
        return { valid: false, errors };
      }
      const categories: Array<{ id: string; name: string; image: string }> = [];
      catsRaw.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors[`categories_${index}`] = "Dòng không hợp lệ.";
          return;
        }
        const o = item as Record<string, unknown>;
        const id = String(o.id ?? "").trim();
        const name = String(o.name ?? "").trim();
        const image = String(o.image ?? "").trim();
        if (!id) {
          errors[`categories_${index}_id`] = "Mã danh mục không được để trống.";
        }
        if (!name) {
          errors[`categories_${index}_name`] = "Tên không được để trống.";
        }
        if (image && !isAllowedImageOrAssetUrl(image)) {
          errors[`categories_${index}_image`] = "URL ảnh phải là http(s)://… hoặc /…";
        }
        categories.push({ id, name, image });
      });
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { title, categories } };
    }
    case "HTML": {
      const html = String(raw.html ?? "");
      if (!html.trim()) {
        errors.html = "Nội dung HTML không được để trống.";
      } else if (html.length > CMS_HTML_MAX_LENGTH) {
        errors.html = `Nội dung quá dài (tối đa ${CMS_HTML_MAX_LENGTH} ký tự).`;
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { html } };
    }
    case "BRAND_STORY": {
      const image = String(raw.image ?? "").trim();
      const line1 = String(raw.line1 ?? "").trim();
      const line2 = String(raw.line2 ?? "").trim();
      if (!image) {
        errors.image = "Ảnh là bắt buộc.";
      } else if (!isAllowedImageOrAssetUrl(image)) {
        errors.image = "URL ảnh phải là http(s)://… hoặc đường dẫn bắt đầu bằng /.";
      }
      if (!line1) {
        errors.line1 = "Dòng chính không được để trống.";
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { image, line1, line2 } };
    }
    case "LOOKBOOK": {
      const imgsRaw = raw.images;
      if (!Array.isArray(imgsRaw) || imgsRaw.length !== 3) {
        errors.images = "Cần đúng 3 ảnh (mảng images gồm 3 phần tử).";
        return { valid: false, errors };
      }
      const images: Array<{ src: string; alt: string }> = [];
      imgsRaw.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors[`images_${index}`] = "Phần tử không hợp lệ.";
          return;
        }
        const o = item as Record<string, unknown>;
        const src = String(o.src ?? "").trim();
        const alt = String(o.alt ?? "").trim();
        if (!src) {
          errors[`images_${index}_src`] = "URL ảnh không được để trống.";
        } else if (!isAllowedImageOrAssetUrl(src)) {
          errors[`images_${index}_src`] = "URL phải là http(s)://… hoặc /…";
        }
        images.push({ src, alt });
      });
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { images } };
    }
    case "VIDEO": {
      const src_mp4 = String(raw.src_mp4 ?? "").trim();
      const src_webm = String(raw.src_webm ?? "").trim();
      const poster = String(raw.poster ?? "").trim();
      if (!src_mp4 && !src_webm) {
        errors.src_mp4 = "Cần ít nhất URL mp4 hoặc webm.";
      }
      for (const [label, url] of [
        ["src_mp4", src_mp4],
        ["src_webm", src_webm],
        ["poster", poster],
      ] as const) {
        if (url && !isAllowedImageOrAssetUrl(url)) {
          errors[label] = "URL phải là http(s)://… hoặc /…";
        }
      }
      const loop = Boolean(raw.loop ?? true);
      const muted = Boolean(raw.muted ?? true);
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { src_mp4, src_webm, poster, loop, muted } };
    }
    case "QUOTE": {
      const text = String(raw.text ?? "").trim();
      const attribution = String(raw.attribution ?? "").trim();
      if (!text) {
        errors.text = "Nội dung quote không được để trống.";
      }
      if (text.length > 4000) {
        errors.text = "Quote quá dài (tối đa 4000 ký tự).";
      }
      if (attribution.length > 500) {
        errors.attribution = "Attribution quá dài.";
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { text, attribution } };
    }
    case "RICH_TEXT": {
      const html = String(raw.html ?? "");
      if (!html.trim()) {
        errors.html = "Nội dung không được để trống.";
      } else if (html.length > CMS_HTML_MAX_LENGTH) {
        errors.html = `Quá dài (tối đa ${CMS_HTML_MAX_LENGTH} ký tự).`;
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { html } };
    }
    case "HOTSPOTS": {
      const image = String(raw.image ?? "").trim();
      if (!image || !isAllowedImageOrAssetUrl(image)) {
        errors.image = "Ảnh nền http(s) hoặc /… là bắt buộc.";
      }
      const hsRaw = raw.hotspots;
      if (!Array.isArray(hsRaw) || hsRaw.length === 0) {
        errors.hotspots = "Cần ít nhất một hotspot.";
      }
      const hotspots: Array<{ x: number; y: number; product_id: string }> = [];
      if (Array.isArray(hsRaw)) {
        hsRaw.forEach((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            errors[`hotspots_${index}`] = "Hotspot không hợp lệ.";
            return;
          }
          const o = item as Record<string, unknown>;
          const x = typeof o.x === "number" ? o.x : Number(o.x);
          const y = typeof o.y === "number" ? o.y : Number(o.y);
          const product_id = String(o.product_id ?? "").trim();
          if (!Number.isFinite(x) || x < 0 || x > 1 || !Number.isFinite(y) || y < 0 || y > 1) {
            errors[`hotspots_${index}_xy`] = "x,y phải là số trong [0,1].";
          }
          if (!CMS_BLOCK_UUID_RE.test(product_id)) {
            errors[`hotspots_${index}_id`] = "product_id phải là UUID.";
          }
          hotspots.push({ x, y, product_id });
        });
      }
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { image, hotspots } };
    }
    case "JOURNAL_LIST": {
      const entriesRaw = raw.entries;
      if (!Array.isArray(entriesRaw) || entriesRaw.length === 0) {
        errors.entries = "Cần ít nhất một entry.";
        return { valid: false, errors };
      }
      const entries: Array<{ title: string; href: string; cover: string }> = [];
      entriesRaw.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors[`entries_${index}`] = "Entry không hợp lệ.";
          return;
        }
        const o = item as Record<string, unknown>;
        const title = String(o.title ?? "").trim();
        const href = String(o.href ?? "").trim();
        const cover = String(o.cover ?? "").trim();
        if (!title) errors[`entries_${index}_title`] = "Tiêu đề bắt buộc.";
        if (!href || !isAllowedLink(href)) errors[`entries_${index}_href`] = "href hợp lệ.";
        if (!cover || !isAllowedImageOrAssetUrl(cover)) errors[`entries_${index}_cover`] = "Cover URL hợp lệ.";
        entries.push({ title, href, cover });
      });
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { entries } };
    }
    case "MARQUEE_LOGOS": {
      const logosRaw = raw.logos;
      if (!Array.isArray(logosRaw) || logosRaw.length === 0) {
        errors.logos = "Cần ít nhất một logo.";
        return { valid: false, errors };
      }
      const logos: Array<{ src: string; alt: string; href: string }> = [];
      logosRaw.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors[`logos_${index}`] = "Logo không hợp lệ.";
          return;
        }
        const o = item as Record<string, unknown>;
        const src = String(o.src ?? "").trim();
        const alt = String(o.alt ?? "").trim();
        const href = String(o.href ?? "").trim();
        if (!src || !isAllowedImageOrAssetUrl(src)) {
          errors[`logos_${index}_src`] = "src http(s) hoặc /…";
        }
        if (href && !isAllowedLink(href)) {
          errors[`logos_${index}_href`] = "href hợp lệ.";
        }
        logos.push({ src, alt, href });
      });
      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { logos } };
    }
    default:
      return { valid: false, errors: { _type: "Loại block không được hỗ trợ." } };
  }
}

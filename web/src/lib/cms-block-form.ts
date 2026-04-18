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
    default:
      return { valid: false, errors: { _type: "Loại block không được hỗ trợ." } };
  }
}

"use client";

import { useState } from "react";
import { CmsAssetLibraryModal } from "@/components/tenant/core/admin/cms/CmsAssetLibraryModal";
import { CategoryTreePicker } from "@/components/tenant/core/admin/cms/CategoryTreePicker";
import { ProductIdsPicker } from "@/components/tenant/core/admin/cms/ProductIdsPicker";
import { CMS_HTML_MAX_LENGTH } from "@/lib/cms-block-form";

type BlockDataFormProps = {
  type: string;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
};

function fieldClass(hasError: boolean) {
  return `rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400/40 ${
    hasError ? "border-red-400 bg-red-50/50" : "border-stone-300 bg-white"
  }`;
}

export function BlockDataForm({ type, value, onChange, errors, disabled }: BlockDataFormProps) {
  switch (type) {
    case "BANNER":
      return <BannerForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "PRODUCT":
      return <ProductForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "CATEGORY":
      return <CategoryForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "HTML":
      return <HtmlForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "BRAND_STORY":
      return <BrandStoryForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "LOOKBOOK":
      return <LookbookForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "VIDEO":
      return <VideoForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "QUOTE":
      return <QuoteForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "RICH_TEXT":
      return <RichTextForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "HOTSPOTS":
      return <HotspotsForm value={value} onChange={onChange} errors={errors} disabled={disabled} />;
    case "JOURNAL_LIST":
      return <JournalListHint />;
    case "MARQUEE_LOGOS":
      return <MarqueeLogosHint />;
    default:
      return (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Chọn loại block hợp lệ (BANNER, PRODUCT, CATEGORY, HTML, BRAND_STORY, LOOKBOOK, VIDEO, QUOTE, RICH_TEXT,
          HOTSPOTS, JOURNAL_LIST, MARQUEE_LOGOS).
        </p>
      );
  }
}

function JournalListHint() {
  return (
    <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
      Dùng tab <strong>JSON</strong> bên dưới để chỉnh <code className="rounded bg-stone-200/80 px-1">entries</code>: mảng{" "}
      <code className="rounded bg-stone-200/80 px-1">{`{ title, href, cover }`}</code>.
    </p>
  );
}

function MarqueeLogosHint() {
  return (
    <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
      Dùng tab <strong>JSON</strong> để chỉnh <code className="rounded bg-stone-200/80 px-1">logos</code>: mảng{" "}
      <code className="rounded bg-stone-200/80 px-1">{`{ src, alt?, href? }`}</code>.
    </p>
  );
}

function HotspotsForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const [assetOpen, setAssetOpen] = useState(false);
  const image = String(value.image ?? "");
  return (
    <div className="space-y-4">
      <CmsAssetLibraryModal
        open={assetOpen}
        onClose={() => setAssetOpen(false)}
        onPickUrl={(url) => onChange({ ...value, image: url })}
      />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">
          Ảnh nền <span className="text-red-600">*</span>
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            className={`${fieldClass(Boolean(errors.image))} sm:flex-1`}
            disabled={disabled}
            value={image}
            onChange={(e) => onChange({ ...value, image: e.target.value })}
            placeholder="https://…"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAssetOpen(true)}
            className="rounded-xl border border-stone-400 bg-stone-100 px-4 py-3 text-xs font-bold text-stone-800 shadow-sm hover:bg-stone-200 disabled:opacity-50"
          >
            Thư viện
          </button>
        </div>
        {errors.image ? <p className="text-sm text-red-600">{errors.image}</p> : null}
      </label>
      <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        Hotspots: dùng tab <strong>JSON</strong> để chỉnh <code className="rounded bg-stone-200/80 px-1">hotspots</code> — mảng{" "}
        <code className="rounded bg-stone-200/80 px-1">{`{ x, y, product_id }`}</code> với x,y trong [0,1].
      </p>
    </div>
  );
}

function VideoForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const src_mp4 = String(value.src_mp4 ?? "");
  const src_webm = String(value.src_webm ?? "");
  const poster = String(value.poster ?? "");
  const loop = Boolean(value.loop ?? true);
  const muted = Boolean(value.muted ?? true);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">src_mp4 (URL)</span>
        <input
          className={fieldClass(Boolean(errors.src_mp4))}
          disabled={disabled}
          value={src_mp4}
          onChange={(e) => onChange({ ...value, src_mp4: e.target.value })}
          placeholder="https://…/clip.mp4"
        />
        {errors.src_mp4 ? <p className="text-sm text-red-600">{errors.src_mp4}</p> : null}
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">src_webm (URL, tuỳ chọn)</span>
        <input
          className={fieldClass(Boolean(errors.src_webm))}
          disabled={disabled}
          value={src_webm}
          onChange={(e) => onChange({ ...value, src_webm: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">Poster (ảnh tĩnh)</span>
        <input
          className={fieldClass(Boolean(errors.poster))}
          disabled={disabled}
          value={poster}
          onChange={(e) => onChange({ ...value, poster: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={loop} disabled={disabled} onChange={(e) => onChange({ ...value, loop: e.target.checked })} />
        Loop
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={muted} disabled={disabled} onChange={(e) => onChange({ ...value, muted: e.target.checked })} />
        Muted (khuyến nghị cho autoplay)
      </label>
    </div>
  );
}

function QuoteForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const text = String(value.text ?? "");
  const attribution = String(value.attribution ?? "");
  return (
    <div className="space-y-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Quote *</span>
        <textarea
          className={fieldClass(Boolean(errors.text)) + " min-h-[8rem]"}
          disabled={disabled}
          value={text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
        {errors.text ? <p className="text-sm text-red-600">{errors.text}</p> : null}
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Attribution</span>
        <input
          className={fieldClass(Boolean(errors.attribution))}
          disabled={disabled}
          value={attribution}
          onChange={(e) => onChange({ ...value, attribution: e.target.value })}
        />
      </label>
    </div>
  );
}

function RichTextForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const html = String(value.html ?? "");
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-stone-800">HTML (sẽ được lọc tag trên server)</span>
      <textarea
        className={fieldClass(Boolean(errors.html)) + " min-h-[16rem] font-mono text-[13px]"}
        disabled={disabled}
        value={html}
        onChange={(e) => onChange({ ...value, html: e.target.value })}
        spellCheck={false}
        maxLength={CMS_HTML_MAX_LENGTH}
      />
      {errors.html ? <p className="text-sm text-red-600">{errors.html}</p> : null}
    </label>
  );
}

function BannerForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const [assetOpen, setAssetOpen] = useState(false);
  const image_url = String(value.image_url ?? "");
  const title = String(value.title ?? "");
  const subtitle = String(value.subtitle ?? "");
  const cta_text = String(value.cta_text ?? "");
  const cta_link = String(value.cta_link ?? "");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <CmsAssetLibraryModal
        open={assetOpen}
        onClose={() => setAssetOpen(false)}
        onPickUrl={(url) => onChange({ ...value, image_url: url })}
      />
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">
          Ảnh (URL) <span className="font-normal text-stone-500">— tùy chọn</span>
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            className={`${fieldClass(Boolean(errors.image_url))} sm:flex-1`}
            disabled={disabled}
            value={image_url}
            onChange={(e) => onChange({ ...value, image_url: e.target.value })}
            placeholder="https://… hoặc /images/hero.jpg"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAssetOpen(true)}
            className="rounded-xl border border-stone-400 bg-stone-100 px-4 py-3 text-xs font-bold text-stone-800 shadow-sm hover:bg-stone-200 disabled:opacity-50"
          >
            Thư viện
          </button>
        </div>
        {errors.image_url ? <p className="text-sm text-red-600">{errors.image_url}</p> : null}
      </label>
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">
          Tiêu đề <span className="text-red-600">*</span>
        </span>
        <input
          className={fieldClass(Boolean(errors.title))}
          disabled={disabled}
          value={title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Tiêu đề banner"
        />
        {errors.title ? <p className="text-sm text-red-600">{errors.title}</p> : null}
      </label>
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">Mô tả phụ</span>
        <input
          className={fieldClass(false)}
          disabled={disabled}
          value={subtitle}
          onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
          placeholder="Dòng mô tả ngắn"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Chữ nút CTA</span>
        <input
          className={fieldClass(false)}
          disabled={disabled}
          value={cta_text}
          onChange={(e) => onChange({ ...value, cta_text: e.target.value })}
          placeholder="Ví dụ: Mua ngay"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Liên kết CTA</span>
        <input
          className={fieldClass(Boolean(errors.cta_link))}
          disabled={disabled}
          value={cta_link}
          onChange={(e) => onChange({ ...value, cta_link: e.target.value })}
          placeholder="/products hoặc https://…"
        />
        {errors.cta_link ? <p className="text-sm text-red-600">{errors.cta_link}</p> : null}
      </label>
    </div>
  );
}

function ProductForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const title = String(value.title ?? "");
  const ids = Array.isArray(value.product_ids)
    ? (value.product_ids as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  return (
    <div className="space-y-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Tiêu đề nhóm sản phẩm</span>
        <input
          className={fieldClass(false)}
          disabled={disabled}
          value={title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Ví dụ: Bán chạy nhất"
        />
      </label>
      <ProductIdsPicker
        ids={ids}
        disabled={disabled}
        error={errors.product_ids}
        onIdsChange={(next) => onChange({ ...value, product_ids: next })}
      />
    </div>
  );
}

function CategoryForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const title = String(value.title ?? "");
  const categories = Array.isArray(value.categories)
    ? (value.categories as unknown[]).map((raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return { id: "", name: "", image: "" };
        }
        const o = raw as Record<string, unknown>;
        return {
          id: String(o.id ?? ""),
          name: String(o.name ?? ""),
          image: String(o.image ?? ""),
        };
      })
    : [];

  return (
    <div className="space-y-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Tiêu đề lưới</span>
        <input
          className={fieldClass(false)}
          disabled={disabled}
          value={title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Ví dụ: Mua theo danh mục"
        />
      </label>

      <div>
        <h4 className="text-sm font-bold text-stone-800">Các ô danh mục</h4>
        <p className="mt-1 text-xs text-stone-500">
          Chọn từ cây danh mục công khai; thứ tự kéo bằng nút lên/xuống.
        </p>
        <div className="mt-4">
          <CategoryTreePicker
            categories={categories}
            disabled={disabled}
            errors={errors}
            onCategoriesChange={(next) => onChange({ ...value, categories: next })}
          />
        </div>
      </div>
    </div>
  );
}

function BrandStoryForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const [assetOpen, setAssetOpen] = useState(false);
  const image = String(value.image ?? "");
  const line1 = String(value.line1 ?? "");
  const line2 = String(value.line2 ?? "");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <CmsAssetLibraryModal
        open={assetOpen}
        onClose={() => setAssetOpen(false)}
        onPickUrl={(url) => onChange({ ...value, image: url })}
      />
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">
          Ảnh (URL) <span className="text-red-600">*</span>
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            className={`${fieldClass(Boolean(errors.image))} sm:flex-1`}
            disabled={disabled}
            value={image}
            onChange={(e) => onChange({ ...value, image: e.target.value })}
            placeholder="https://… hoặc /images/story.jpg"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAssetOpen(true)}
            className="rounded-xl border border-stone-400 bg-stone-100 px-4 py-3 text-xs font-bold text-stone-800 shadow-sm hover:bg-stone-200 disabled:opacity-50"
          >
            Thư viện
          </button>
        </div>
        {errors.image ? <p className="text-sm text-red-600">{errors.image}</p> : null}
      </label>
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">
          Dòng chính (line1) <span className="text-red-600">*</span>
        </span>
        <textarea
          className={fieldClass(Boolean(errors.line1)) + " min-h-[5rem]"}
          disabled={disabled}
          value={line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
          placeholder="Tiêu đề câu chuyện — font serif lớn trên site."
        />
        {errors.line1 ? <p className="text-sm text-red-600">{errors.line1}</p> : null}
      </label>
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">Dòng phụ (line2)</span>
        <textarea
          className={fieldClass(false) + " min-h-[4rem]"}
          disabled={disabled}
          value={line2}
          onChange={(e) => onChange({ ...value, line2: e.target.value })}
          placeholder="Mô tả ngắn, tone nhẹ hơn line1."
        />
      </label>
    </div>
  );
}

function LookbookForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const images = Array.isArray(value.images)
    ? (value.images as unknown[]).map((raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return { src: "", alt: "" };
        }
        const o = raw as Record<string, unknown>;
        return { src: String(o.src ?? ""), alt: String(o.alt ?? "") };
      })
    : [
        { src: "", alt: "" },
        { src: "", alt: "" },
        { src: "", alt: "" },
      ];
  while (images.length < 3) images.push({ src: "", alt: "" });
  const three = images.slice(0, 3);

  function patchSlot(index: number, patch: Partial<{ src: string; alt: string }>) {
    const next = three.map((img, i) => (i === index ? { ...img, ...patch } : img));
    onChange({ ...value, images: next });
  }

  return (
    <div className="space-y-6">
      {errors.images ? <p className="text-sm text-red-600">{errors.images}</p> : null}
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">Ảnh {i + 1} / 3</p>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-stone-800">URL ảnh *</span>
            <input
              className={fieldClass(Boolean(errors[`images_${i}_src`]))}
              disabled={disabled}
              value={three[i]?.src ?? ""}
              onChange={(e) => patchSlot(i, { src: e.target.value })}
            />
            {errors[`images_${i}_src`] ? (
              <p className="text-sm text-red-600">{errors[`images_${i}_src`]}</p>
            ) : null}
          </label>
          <label className="mt-3 flex flex-col gap-2">
            <span className="text-sm font-semibold text-stone-800">Alt (mô tả ngắn cho a11y)</span>
            <input
              className={fieldClass(false)}
              disabled={disabled}
              value={three[i]?.alt ?? ""}
              onChange={(e) => patchSlot(i, { alt: e.target.value })}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function HtmlForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const html = String(value.html ?? "");
  const remaining = CMS_HTML_MAX_LENGTH - html.length;

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-stone-800">
        Nội dung HTML <span className="text-red-600">*</span>
      </span>
      <textarea
        className={fieldClass(Boolean(errors.html)) + " min-h-[14rem] font-mono text-[13px]"}
        disabled={disabled}
        value={html}
        onChange={(e) => onChange({ ...value, html: e.target.value })}
        spellCheck={false}
        maxLength={CMS_HTML_MAX_LENGTH}
      />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-stone-500">
        <span>Tối đa {CMS_HTML_MAX_LENGTH.toLocaleString("vi-VN")} ký tự (khớp API).</span>
        <span className={remaining < 500 ? "font-semibold text-amber-800" : ""}>
          Còn lại: {remaining.toLocaleString("vi-VN")} ký tự
        </span>
      </div>
      {errors.html ? <p className="text-sm text-red-600">{errors.html}</p> : null}
    </label>
  );
}

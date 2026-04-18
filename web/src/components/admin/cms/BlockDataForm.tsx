"use client";

import { CategoryTreePicker } from "@/components/admin/cms/CategoryTreePicker";
import { ProductIdsPicker } from "@/components/admin/cms/ProductIdsPicker";
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
    default:
      return (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Chọn loại block hợp lệ (BANNER, PRODUCT, CATEGORY, HTML).
        </p>
      );
  }
}

function BannerForm({
  value,
  onChange,
  errors,
  disabled,
}: Omit<BlockDataFormProps, "type">) {
  const image_url = String(value.image_url ?? "");
  const title = String(value.title ?? "");
  const subtitle = String(value.subtitle ?? "");
  const cta_text = String(value.cta_text ?? "");
  const cta_link = String(value.cta_link ?? "");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm font-semibold text-stone-800">
          Ảnh (URL) <span className="font-normal text-stone-500">— tùy chọn</span>
        </span>
        <input
          className={fieldClass(Boolean(errors.image_url))}
          disabled={disabled}
          value={image_url}
          onChange={(e) => onChange({ ...value, image_url: e.target.value })}
          placeholder="https://… hoặc /images/hero.jpg"
        />
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
          placeholder="/collections hoặc https://…"
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

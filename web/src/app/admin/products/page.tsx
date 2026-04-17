"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProductById,
  getAdminProducts,
  patchAdminProduct,
  type AdminProduct,
} from "@/lib/admin-api";
import { listCategoryTreePublic, type CategoryListItem } from "@/lib/categories-api";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createImages, setCreateImages] = useState("");
  const [createFiles, setCreateFiles] = useState<File[]>([]);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editImageList, setEditImageList] = useState<string[]>([]);
  const [editMainImageIndex, setEditMainImageIndex] = useState(0);
  const [editFiles, setEditFiles] = useState<File[]>([]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminProducts({
        page: 1,
        limit: 100,
        sort,
        keyword: keyword.trim() || undefined,
        is_active: true,
      });
      setProducts(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [keyword, sort]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const tree = await listCategoryTreePublic();
        const subcategories: CategoryListItem[] = tree.flatMap((parent) =>
          (parent.children ?? []).map((child) => ({
            id: child.id,
            name: `${parent.name} / ${child.name}`,
            slug: child.slug,
            parent_id: parent.id,
            level: 2 as const,
            image_url: child.image_url,
            is_active: true,
          })),
        );
        setCategories(subcategories);
      } catch {
        setCategories([]);
      }
      await loadProducts();
    }

    void bootstrap();
  }, [loadProducts]);

  async function openEdit(product: AdminProduct) {
    try {
      setActionLoading(true);
      setError(null);
      const detail = await getAdminProductById(product.id);
      setSelectedProduct(product);
      setEditName(detail.name);
      setEditDescription(detail.description ?? "");
      setEditPrice(String(detail.price));
      setEditActive(detail.is_active);
      setEditImageList(detail.images ?? []);
      setEditMainImageIndex(0);
      setEditFiles([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết sản phẩm.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);

      const imageList = createImages
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      await createAdminProduct({
        name: createName.trim(),
        description: createDescription.trim(),
        price: Number(createPrice),
        category_id: createCategoryId,
        images: imageList,
        image_files: createFiles,
      });

      setCreateName("");
      setCreateDescription("");
      setCreatePrice("");
      setCreateCategoryId("");
      setCreateImages("");
      setCreateFiles([]);
      setShowCreateForm(false);
      setSuccessMessage("Đã tạo sản phẩm.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tạo được sản phẩm.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedProduct) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      await patchAdminProduct(selectedProduct.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        price: Number(editPrice),
        is_active: editActive,
        main_image_index: editMainImageIndex,
        images: editImageList,
        image_files: editFiles,
      });
      setSuccessMessage("Đã cập nhật sản phẩm.");
      await loadProducts();
      const fresh = products.find((item) => item.id === selectedProduct.id);
      if (fresh) {
        await openEdit(fresh);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không cập nhật được sản phẩm.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Xóa mềm sản phẩm này?");
    if (!ok) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      await deleteAdminProduct(id);
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
      setSuccessMessage("Đã xóa sản phẩm.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không xóa được sản phẩm.");
    } finally {
      setActionLoading(false);
    }
  }

  function removeEditImage(index: number) {
    setEditImageList((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      setEditMainImageIndex((current) => {
        if (next.length === 0) {
          return 0;
        }
        if (current === index) {
          return 0;
        }
        if (current > index) {
          return current - 1;
        }
        return current;
      });
      return next;
    });
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý sản phẩm</h1>
        <p className="mt-1 text-sm text-stone-600">
          Danh sách sản phẩm được tải trực tiếp từ API. Cần quyền{" "}
          <code className="rounded bg-stone-100 px-1">PRODUCT_MANAGE</code>.
        </p>
      </header>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <form
        className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadProducts();
        }}
      >
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên sản phẩm"
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as "newest" | "price_asc" | "price_desc")}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Lọc
        </button>
      </form>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          {showCreateForm ? "Đóng form tạo mới" : "Tạo mới sản phẩm"}
        </button>
      </div>

      {showCreateForm ? (
        <form onSubmit={(event) => void handleCreate(event)} className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-sm font-semibold text-stone-900">Tạo sản phẩm</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-stone-600">Tên sản phẩm *</span>
              <input
                required
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Giá *</span>
              <input
                required
                type="number"
                min={0}
                value={createPrice}
                onChange={(event) => setCreatePrice(event.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">Mô tả *</span>
            <textarea
              required
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Danh mục con (level 2) *</span>
            <select
              required
              value={createCategoryId}
              onChange={(event) => setCreateCategoryId(event.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {categories.length === 0 ? (
              <span className="mt-1 block text-xs text-rose-600">
                Chưa có danh mục con (level 2). Vui lòng tạo category con trước.
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Danh sách ảnh URL (mỗi dòng 1 URL, có thể để trống nếu upload file)</span>
            <textarea
              value={createImages}
              onChange={(event) => setCreateImages(event.target.value)}
              rows={3}
              placeholder="https://.../img1.jpg&#10;https://.../img2.jpg"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Upload ảnh từ máy (nhiều ảnh)</span>
            <input
              multiple
              type="file"
              accept="image/*"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setCreateFiles(files);
              }}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Ảnh upload sẽ lưu theo đường dẫn S3: /products/&lt;ten-san-pham&gt;/
            </span>
          </label>
          <button
            type="submit"
            disabled={actionLoading}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
          >
            Tạo mới
          </button>
        </form>
      ) : null}

      {error ? (
        <div className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-stone-500">Đang tải dữ liệu sản phẩm...</p> : null}

      {!loading ? (
        <div className={selectedProduct ? "grid gap-5 lg:grid-cols-[1.5fr_1fr]" : "space-y-3"}>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">Tổng sản phẩm hiển thị: {products.length}</p>

            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase text-stone-600">
                  <tr>
                    <th className="px-4 py-3">Sản phẩm</th>
                    <th className="px-4 py-3">Danh mục</th>
                    <th className="px-4 py-3">Giá</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày tạo</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
                          <img src={product.thumbnail} alt={product.name} className="h-12 w-12 rounded-md object-cover" />
                          <div>
                            <p className="font-medium text-stone-900">{product.name}</p>
                            <p className="font-mono text-xs text-stone-500">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{product.category.name}</td>
                      <td className="px-4 py-3 font-semibold">{formatVnd(product.price)}</td>
                      <td className="px-4 py-3">{product.is_active ? "Đang bán" : "Tạm ẩn"}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {new Date(product.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="mr-2 rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100"
                          onClick={() => void openEdit(product)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          onClick={() => void handleDelete(product.id)}
                          disabled={actionLoading}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                        Không có sản phẩm phù hợp.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {selectedProduct ? (
            <aside className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Chi tiết / cập nhật</h2>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
                >
                  Đóng
                </button>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-xs text-stone-500">{selectedProduct.id}</p>
                <label className="block text-sm">
                  Tên
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Mô tả
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Giá
                  <input
                    type="number"
                    min={0}
                    value={editPrice}
                    onChange={(event) => setEditPrice(event.target.value)}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <section className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-medium text-stone-900">Ảnh hiện tại</p>
                  {editImageList.length === 0 ? (
                    <p className="text-xs text-stone-500">Chưa có ảnh. Hãy thêm ảnh mới trước khi lưu.</p>
                  ) : (
                    <div className="space-y-2">
                      {editImageList.map((image, index) => (
                        <div key={`${image}-${index}`} className="flex items-center gap-2 rounded-md border border-stone-200 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
                          <img src={image} alt={`Ảnh ${index + 1}`} className="h-14 w-14 rounded object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-stone-700">Ảnh {index + 1}</p>
                            {index === editMainImageIndex ? (
                              <span className="mt-1 inline-flex rounded bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Thumbnail
                              </span>
                            ) : null}
                          </div>
                          <label className="flex items-center gap-1 text-xs text-stone-600">
                            <input
                              type="checkbox"
                              checked={index === editMainImageIndex}
                              onChange={() => setEditMainImageIndex(index)}
                            />
                            Ảnh main
                          </label>
                          <button
                            type="button"
                            onClick={() => removeEditImage(index)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-sm font-medium text-stone-900">Thêm ảnh mới</p>
                  <input
                    multiple
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setEditFiles(files);
                    }}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                  {editFiles.length > 0 ? (
                    <p className="text-xs text-stone-500">Đã chọn {editFiles.length} file. Khi lưu sẽ thêm vào cuối danh sách ảnh.</p>
                  ) : (
                    <p className="text-xs text-stone-500">Có thể chọn nhiều ảnh để bổ sung vào sản phẩm.</p>
                  )}
                </section>
                <label className="flex items-center gap-2 text-sm">
                  <input checked={editActive} onChange={(event) => setEditActive(event.target.checked)} type="checkbox" />
                  Đang bán
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
                >
                  Lưu thay đổi
                </button>
                <p className="text-xs text-stone-500">
                  PATCH hỗ trợ cập nhật thông tin và thay danh sách ảnh (URL + upload file).
                </p>
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

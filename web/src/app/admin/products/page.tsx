export default function AdminProductsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý sản phẩm</h1>
        <p className="mt-1 text-sm text-stone-600">MVP hiện hiển thị trạng thái sẵn sàng cho module sản phẩm.</p>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Placeholder</h2>
        <p className="mt-2 text-sm text-amber-800">
          API hiện mới có `POST /products` dạng placeholder để kiểm tra quyền `PRODUCT_MANAGE`.
          Dashboard đang giữ trạng thái read-only và sẽ mở rộng khi có endpoint danh sách sản phẩm.
        </p>
      </div>
    </section>
  );
}

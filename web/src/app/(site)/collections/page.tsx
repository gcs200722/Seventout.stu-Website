export default async function CollectionsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Shop</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Bộ sưu tập</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">Nội dung đang được cập nhật.</p>
      </header>
      <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center text-stone-600">
        Trang collections tạm thời để trống.
      </div>
    </div>
  );
}

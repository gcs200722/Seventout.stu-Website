import Link from "next/link";

const cards = [
  {
    title: "Người dùng",
    description: "Theo dõi danh sách tài khoản đã đăng ký.",
    href: "/admin/users",
  },
  {
    title: "Đơn hàng",
    description: "Kiểm tra trạng thái endpoint phân quyền ORDER_MANAGE.",
    href: "/admin/orders",
  },
  {
    title: "Sản phẩm",
    description: "Khu vực placeholder cho module quản lý sản phẩm.",
    href: "/admin/products",
  },
];

export default function AdminDashboardPage() {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-stone-600">
          Khu vực quản trị nội bộ cho tài khoản ADMIN và STAFF.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-stone-200 bg-stone-50 p-4 hover:border-stone-300 hover:bg-white"
          >
            <h2 className="text-base font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

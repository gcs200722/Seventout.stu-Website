import Link from "next/link";

const quickLinks = ["About", "Shipping", "Returns", "Contact"];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-stone-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="text-base font-bold text-stone-900">Sevenout</h3>
          <p className="mt-3 text-sm text-stone-600">
            Local brand for daily essentials. Minimal design, wearable comfort, and crafted details.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-stone-900">Quick Links</h4>
          <ul className="mt-3 space-y-2">
            {quickLinks.map((item) => (
              <li key={item}>
                <Link href="#" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-stone-900">Customer Care</h4>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>Email: support@s7local.vn</li>
            <li>Phone: +84 909 123 456</li>
            <li>Mon - Sat: 9:00 - 21:00</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-stone-900">Newsletter</h4>
          <p className="mt-3 text-sm text-stone-600">Get local drops and exclusive promo updates.</p>
          <form className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Your email"
              className="w-full rounded-full border border-stone-300 px-4 py-2 text-sm outline-none ring-0 transition focus:border-stone-800"
            />
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Sevenout. All rights reserved.
      </div>
    </footer>
  );
}

export function PlatformLandingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-[#F2F0EB] px-8 pb-12 pt-16">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <div className="mb-3 text-xl text-zinc-900">LUMIERE</div>
          <p className="max-w-xs text-sm text-zinc-700">
            © 2024 Lumiere Fashion SaaS. Crafted for local artisans.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-zinc-600">
          <a className="nav-link" href="#">
            About
          </a>
          <a className="nav-link" href="#">
            Privacy Policy
          </a>
          <a className="nav-link" href="#">
            Contact
          </a>
          <a className="nav-link" href="#">
            Instagram
          </a>
          <a className="nav-link" href="#">
            Pinterest
          </a>
        </div>
      </div>
    </footer>
  );
}

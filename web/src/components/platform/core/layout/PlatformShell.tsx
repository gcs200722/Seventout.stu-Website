"use client";

import Link from "next/link";
import { PlatformTenantSwitcher } from "./PlatformTenantSwitcher";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/platform" className="text-sm font-semibold tracking-wide">
              PLATFORM
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-600">
              <Link href="/platform">Landing</Link>
              <Link href="/admin">Legacy Admin</Link>
            </nav>
          </div>
          <PlatformTenantSwitcher />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

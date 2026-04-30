"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlatformAuth } from "@/components/platform/core/auth/PlatformAuthProvider";
import { PlatformLandingAuthDialog } from "@/components/platform/landing/PlatformLandingAuthDialog";

export function PlatformLandingNavbar() {
  const { user, loading, logout } = usePlatformAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-200/60 bg-[#F9F8F6]/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-8 py-6">
          <Link
            href="/platform"
            className="text-2xl tracking-tight text-zinc-900 transition-opacity hover:opacity-70"
          >
            LUMIERE
          </Link>
          <div className="hidden items-center gap-10 md:flex">
            <a className="nav-link font-medium text-emerald-800" href="#features">
              Features
            </a>
            <a className="nav-link font-medium text-zinc-600" href="#templates">
              Templates
            </a>
            <a className="nav-link font-medium text-zinc-600" href="#pricing">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            {loading ? (
              <span
                className="h-5 w-20 shrink-0 animate-pulse rounded bg-zinc-200/80"
                aria-hidden
              />
            ) : user ? (
              <>
                <Link
                  href="/platform/app"
                  className="hidden font-medium text-zinc-600 hover:text-zinc-900 sm:inline"
                >
                  Dashboard
                </Link>
                {user.email ? (
                  <span
                    className="hidden max-w-[160px] truncate text-sm text-zinc-500 lg:inline"
                    title={user.email}
                  >
                    {user.email}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }}
                  className="font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthOpen(true);
                  }}
                  className="rounded-full bg-emerald-800 px-6 py-2.5 font-semibold text-white shadow-md hover:bg-emerald-900"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      <PlatformLandingAuthDialog
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}

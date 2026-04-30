"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { CategoryNavLink } from "@/lib/categories-api";

type MegaMenuProps = {
  items?: CategoryNavLink[];
  onNavigate?: () => void;
};

export function MegaMenu({ items = [], onNavigate }: MegaMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      className="relative pb-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#2f2a24] transition-colors hover:text-[#7a5d3d]"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Shop
        <span className="text-xs">▾</span>
      </button>

      {open ? (
        <div className="absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 rounded-xl border border-[#e2d5bf] bg-[#fffdf9] p-2 shadow-xl">
          <ul className="space-y-1">
            {items.length > 0 ? items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-xs font-medium tracking-[0.08em] text-[#2f2a24] transition hover:bg-[#f3eadc] hover:text-[#7a5d3d]"
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              </li>
            )) : (
              <li className="px-3 py-2 text-xs text-stone-500">Dang cap nhat danh muc...</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

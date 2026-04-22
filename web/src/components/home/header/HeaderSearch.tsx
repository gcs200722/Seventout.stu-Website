"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildProductHref, listProductsPublic, type ProductListItem } from "@/lib/products-api";

const RECENT_SEARCHES_STORAGE_KEY = "sevenout_recent_searches";
const TRENDING_SEARCHES = ["hoodie", "local brand", "dress", "bag", "new arrival"];

type HeaderSearchProps = {
  open: boolean;
  onClose: () => void;
};

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(keyword: string) {
  if (typeof window === "undefined") return;
  const normalized = keyword.trim();
  if (!normalized) return;
  const merged = [normalized, ...readRecentSearches().filter((value) => value !== normalized)].slice(0, 6);
  window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(merged));
}

export function HeaderSearch({ open, onClose }: HeaderSearchProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches());
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmedKeyword = useMemo(() => keyword.trim(), [keyword]);

  useEffect(() => {
    if (!open || trimmedKeyword.length < 2) return;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void listProductsPublic({ page: 1, limit: 5, keyword: trimmedKeyword, sort: "newest" })
        .then((response) => setSuggestions(response.items))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [open, trimmedKeyword]);

  function submitSearch(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    saveRecentSearch(normalized);
    setRecent(readRecentSearches());
    setSuggestions([]);
    onClose();
    router.push(`/products?keyword=${encodeURIComponent(normalized)}&page=1`);
  }

  if (!open) return null;

  return (
    <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[min(96vw,560px)] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl">
      <form
        className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch(keyword);
        }}
      >
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Search product, brand..."
          className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
          aria-label="Search products"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700"
        >
          Search
        </button>
      </form>

      <section className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Trending</p>
        <div className="flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => submitSearch(term)}
              className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
            >
              {term}
            </button>
          ))}
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Recent search</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => submitSearch(term)}
                className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 transition hover:bg-stone-100"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Auto suggest</p>
          {loading ? <span className="text-xs text-stone-500">Loading...</span> : null}
        </div>

        {trimmedKeyword.length < 2 || suggestions.length === 0 ? (
          <p className="text-sm text-stone-500">Type at least 2 characters to see suggestions.</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((item) => (
              <li key={item.id}>
                <Link
                  href={buildProductHref(item)}
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm transition hover:bg-stone-50"
                  onClick={onClose}
                >
                  <span className="line-clamp-1 text-stone-800">{item.name}</span>
                  <span className="text-xs text-stone-500">{item.category.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import { getApiErrorMessage } from "@/lib/api-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
};

export type CmsPublishedBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type CmsPublishedSection = {
  id: string;
  type: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  blocks: CmsPublishedBlock[];
};

export type CmsPublishedPage = {
  id: string;
  key: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sections: CmsPublishedSection[];
};

const cmsFetchInit: RequestInit = {
  next: { revalidate: 120 },
  headers: { "Content-Type": "application/json" },
};

export async function getPublishedCmsPageByKey(key: string): Promise<CmsPublishedPage | null> {
  try {
    const response = await fetch(`${API_URL}/cms/pages/by-key/${encodeURIComponent(key)}`, cmsFetchInit);
    const json = (await response.json()) as ApiEnvelope<CmsPublishedPage>;
    if (!response.ok) {
      return null;
    }
    if (!json.success || !json.data) {
      return null;
    }
    return json.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : getApiErrorMessage(err, "CMS unavailable");
    console.warn("CMS fetch failed:", msg);
    return null;
  }
}

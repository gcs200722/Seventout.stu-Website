import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
};

export type CmsPublishedBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  appearance?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type CmsPublishedSection = {
  id: string;
  type: string;
  title: string;
  layout?: Record<string, unknown>;
  targeting?: Record<string, unknown>;
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
  theme?: {
    id: string;
    slug: string;
    name: string;
    tokens: Record<string, string>;
  } | null;
  sections: CmsPublishedSection[];
};

function cmsFetchInitForKey(key: string): RequestInit {
  return {
    next: { revalidate: 120, tags: ["cms", `cms:${key}`] },
    headers: { "Content-Type": "application/json" },
  };
}

export async function getPublishedCmsPageByKey(key: string): Promise<CmsPublishedPage | null> {
  try {
    const response = await apiFetch(`/cms/pages/by-key/${encodeURIComponent(key)}`, cmsFetchInitForKey(key));
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

const cmsPreviewFetchInit: RequestInit = {
  cache: "no-store",
  headers: { "Content-Type": "application/json" },
};

/** Admin preview: same shape as published page but includes inactive blocks/sections. */
export async function getCmsPreviewPage(previewToken: string): Promise<CmsPublishedPage | null> {
  try {
    const q = new URLSearchParams({ token: previewToken });
    const response = await apiFetch(`/cms/pages/preview?${q.toString()}`, cmsPreviewFetchInit);
    const json = (await response.json()) as ApiEnvelope<CmsPublishedPage>;
    if (!response.ok) {
      return null;
    }
    if (!json.success || !json.data) {
      return null;
    }
    return json.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : getApiErrorMessage(err, "CMS preview unavailable");
    console.warn("CMS preview fetch failed:", msg);
    return null;
  }
}

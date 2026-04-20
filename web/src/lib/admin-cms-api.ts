import { adminFetchEnvelope } from "@/lib/admin-api";

export type CmsAdminBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  appearance?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type CmsAdminSection = {
  id: string;
  type: string;
  title: string;
  layout?: Record<string, unknown>;
  targeting?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  blocks: CmsAdminBlock[];
};

export type CmsAdminPage = {
  id: string;
  key: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sections: CmsAdminSection[];
};

export async function listAdminCmsPages(): Promise<CmsAdminPage[]> {
  const res = await adminFetchEnvelope<CmsAdminPage[]>("/cms/pages");
  if (!res.data) {
    throw new Error("Unexpected API response: missing CMS pages data");
  }
  return res.data;
}

export async function getAdminCmsPage(pageId: string): Promise<CmsAdminPage> {
  const res = await adminFetchEnvelope<CmsAdminPage>(`/cms/pages/${pageId}`);
  if (!res.data) {
    throw new Error("Unexpected API response: missing CMS page data");
  }
  return res.data;
}

export async function mintCmsPreviewToken(
  pageId: string,
): Promise<{ token: string; expires_in_seconds: number }> {
  const res = await adminFetchEnvelope<{ token: string; expires_in_seconds: number }>(
    `/cms/pages/${pageId}/preview-token`,
    { method: "POST" },
  );
  if (!res.data) {
    throw new Error("Unexpected API response: missing preview token");
  }
  return res.data;
}

export async function publishAdminCmsPage(pageId: string): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/pages/${pageId}/publish`, { method: "POST" });
}

export async function createAdminCmsPage(payload: {
  page_key: string;
  title: string;
  is_active?: boolean;
}): Promise<CmsAdminPage> {
  const res = await adminFetchEnvelope<CmsAdminPage>("/cms/pages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response after creating CMS page");
  }
  return res.data;
}

export async function addAdminCmsSection(
  pageId: string,
  payload: {
    type: string;
    title: string;
    sort_order?: number;
    is_active?: boolean;
    layout?: Record<string, unknown>;
    targeting?: Record<string, unknown>;
  },
): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/pages/${pageId}/sections`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reorderAdminCmsSections(
  pageId: string,
  section_ids: string[],
): Promise<CmsAdminPage> {
  const res = await adminFetchEnvelope<CmsAdminPage>(`/cms/pages/${pageId}/sections/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ section_ids }),
  });
  if (!res.data) {
    throw new Error("Unexpected API response after reordering sections");
  }
  return res.data;
}

export async function patchAdminCmsSection(
  sectionId: string,
  payload: {
    type?: string;
    title?: string;
    sort_order?: number;
    is_active?: boolean;
    layout?: Record<string, unknown>;
    targeting?: Record<string, unknown>;
  },
): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCmsSection(sectionId: string): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/sections/${sectionId}`, {
    method: "DELETE",
  });
}

export async function addAdminCmsBlock(
  sectionId: string,
  payload: {
    type: string;
    data: Record<string, unknown>;
    sort_order?: number;
    is_active?: boolean;
    appearance?: Record<string, unknown>;
  },
): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/sections/${sectionId}/blocks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchAdminCmsBlock(
  blockId: string,
  payload: {
    type?: string;
    data?: Record<string, unknown>;
    sort_order?: number;
    is_active?: boolean;
    appearance?: Record<string, unknown>;
  },
): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/sections/blocks/${blockId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCmsBlock(blockId: string): Promise<void> {
  await adminFetchEnvelope<unknown>(`/cms/sections/blocks/${blockId}`, {
    method: "DELETE",
  });
}

export async function reorderAdminCmsBlocks(
  sectionId: string,
  block_ids: string[],
): Promise<CmsAdminSection> {
  const res = await adminFetchEnvelope<CmsAdminSection>(`/cms/sections/${sectionId}/blocks/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ block_ids }),
  });
  if (!res.data) {
    throw new Error("Unexpected API response after reordering blocks");
  }
  return res.data;
}

export type CmsAdminAsset = {
  id: string;
  object_key: string;
  public_url: string;
  mime: string;
  alt: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export async function listAdminCmsAssets(limit?: number): Promise<CmsAdminAsset[]> {
  const q = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : "";
  const res = await adminFetchEnvelope<CmsAdminAsset[]>(`/cms/assets${q}`);
  if (!res.data) {
    throw new Error("Unexpected API response: missing CMS assets");
  }
  return res.data;
}

export async function presignAdminCmsAsset(body: {
  content_type: string;
  filename?: string;
}): Promise<{
  object_key: string;
  upload_url: string;
  public_url: string;
  expires_in_seconds: number;
}> {
  const res = await adminFetchEnvelope<{
    object_key: string;
    upload_url: string;
    public_url: string;
    expires_in_seconds: number;
  }>("/cms/assets/presign", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing presign payload");
  }
  return res.data;
}

export async function registerAdminCmsAsset(body: {
  object_key: string;
  public_url: string;
  mime: string;
  alt?: string;
  width?: number;
  height?: number;
}): Promise<CmsAdminAsset> {
  const res = await adminFetchEnvelope<CmsAdminAsset>("/cms/assets/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing CMS asset");
  }
  return res.data;
}

export async function scheduleAdminCmsPublish(
  pageId: string,
  run_at: string,
): Promise<{ scheduled: true; delay_ms: number }> {
  const res = await adminFetchEnvelope<{ scheduled: true; delay_ms: number }>(
    `/cms/pages/${pageId}/schedule-publish`,
    {
      method: "POST",
      body: JSON.stringify({ run_at }),
    },
  );
  if (!res.data) {
    throw new Error("Unexpected API response: missing schedule payload");
  }
  return res.data;
}

import { adminFetchEnvelope } from "@/lib/admin-api";

export type CmsAdminBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type CmsAdminSection = {
  id: string;
  type: string;
  title: string;
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

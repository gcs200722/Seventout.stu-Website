import { redirect } from "next/navigation";

export default async function DynamicCmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ pageKey: string }>;
  searchParams?: Promise<{ cms_preview_token?: string | string[] }>;
}) {
  const { pageKey } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const rawToken = sp?.cms_preview_token;
  const previewToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const nextUrl = previewToken
    ? `/${encodeURIComponent(pageKey)}?cms_preview_token=${encodeURIComponent(previewToken)}`
    : `/${encodeURIComponent(pageKey)}`;
  redirect(nextUrl);
}

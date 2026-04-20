import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CmsHomePreviewBanner } from "@/app/(site)/CmsHomePreviewBanner";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import { getCmsPreviewPage, getPublishedCmsPageByKey } from "@/lib/cms-api";

type PageSearchParams = { cms_preview_token?: string | string[] };

export default async function DynamicCmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ pageKey: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { pageKey } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const rawToken = sp?.cms_preview_token;
  const previewToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const cookieHeader = h.get("cookie");
  const locale = cookieHeader?.includes("NEXT_LOCALE=en") ? "en" : "vi";

  const cmsPage = previewToken
    ? await getCmsPreviewPage(previewToken)
    : await getPublishedCmsPageByKey(pageKey);

  if (!cmsPage?.sections?.length) {
    notFound();
  }

  return (
    <>
      {previewToken ? <CmsHomePreviewBanner /> : null}
      <CmsPageRenderer
        page={cmsPage}
        userAgent={userAgent}
        cookieHeader={cookieHeader}
        locale={locale}
      />
    </>
  );
}

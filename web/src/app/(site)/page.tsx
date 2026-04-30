import { headers } from "next/headers";
import { CmsHomePreviewBanner } from "@/app/(site)/CmsHomePreviewBanner";
import { HomepageCmsSections } from "@/components/tenant/extensions/home/HomepageCmsSections";
import { HomepageStaticFallback } from "@/components/tenant/extensions/home/HomepageStaticFallback";
import { getCmsPreviewPage, getPublishedCmsPageByKey } from "@/lib/cms-api";

type HomeSearchParams = { cms_preview_token?: string | string[] };

export default async function Home({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const sp = searchParams ? await searchParams : undefined;
  const rawToken = sp?.cms_preview_token;
  const previewToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const cookieHeader = h.get("cookie");
  const locale = cookieHeader?.includes("NEXT_LOCALE=en") ? "en" : "vi";

  const cmsPage = previewToken
    ? await getCmsPreviewPage(previewToken)
    : await getPublishedCmsPageByKey("homepage");

  if (cmsPage?.sections?.length) {
    return (
      <>
        {previewToken ? <CmsHomePreviewBanner /> : null}
        <HomepageCmsSections
          page={cmsPage}
          userAgent={userAgent}
          cookieHeader={cookieHeader}
          locale={locale}
        />
      </>
    );
  }

  return (
    <>
      {previewToken ? <CmsHomePreviewBanner /> : null}
      <HomepageStaticFallback />
    </>
  );
}

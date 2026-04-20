import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import type { CmsPublishedPage } from "@/lib/cms-api";

/** @deprecated Prefer importing `CmsPageRenderer` from `@/components/cms/CmsPageRenderer`. */
export async function HomepageCmsSections({
  page,
  userAgent,
  cookieHeader,
  locale,
}: {
  page: CmsPublishedPage;
  userAgent?: string;
  cookieHeader?: string | null;
  locale?: string;
}) {
  return <CmsPageRenderer page={page} userAgent={userAgent} cookieHeader={cookieHeader} locale={locale} />;
}

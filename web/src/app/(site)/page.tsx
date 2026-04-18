import { HomepageCmsSections } from "@/components/home/HomepageCmsSections";
import { HomepageStaticFallback } from "@/components/home/HomepageStaticFallback";
import { getPublishedCmsPageByKey } from "@/lib/cms-api";

export default async function Home() {
  const cmsPage = await getPublishedCmsPageByKey("homepage");

  if (cmsPage?.sections?.length) {
    return <HomepageCmsSections page={cmsPage} />;
  }

  return <HomepageStaticFallback />;
}

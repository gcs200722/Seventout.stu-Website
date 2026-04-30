import { Footer } from "@/components/tenant/extensions/home/Footer";
import { Header } from "@/components/tenant/extensions/home/Header";
import { ActivePromotionsBanner } from "@/components/tenant/extensions/promotions/ActivePromotionsBanner";
import { getCategoryNavLinks } from "@/lib/categories-api";
import { SiteProviders } from "./SiteProviders";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categoryLinks = await getCategoryNavLinks(4);

  return (
    <SiteProviders>
      <div className="flex min-h-screen flex-col bg-sevenout-muted text-neutral-900">
        <Header categoryLinks={categoryLinks} />
        <ActivePromotionsBanner />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SiteProviders>
  );
}

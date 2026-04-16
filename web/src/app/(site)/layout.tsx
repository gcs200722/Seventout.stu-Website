import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { getCategoryNavLinks } from "@/lib/categories-api";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categoryLinks = await getCategoryNavLinks(4);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header categoryLinks={categoryLinks} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

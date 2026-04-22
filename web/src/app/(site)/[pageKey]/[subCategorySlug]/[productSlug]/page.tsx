import { notFound, redirect } from "next/navigation";

import { buildProductHref, getProductBySlugPublic } from "@/lib/products-api";

type PageProps = {
  params: Promise<{
    pageKey: string;
    subCategorySlug: string;
    productSlug: string;
  }>;
};

export default async function ProductLegacyPathRedirectPage({ params }: PageProps) {
  const { pageKey, subCategorySlug, productSlug } = await params;

  let product: Awaited<ReturnType<typeof getProductBySlugPublic>> | null = null;
  try {
    product = await getProductBySlugPublic(productSlug);
  } catch {
    product = null;
  }
  if (!product) {
    notFound();
  }

  if (
    product.category.parent?.slug !== pageKey ||
    product.category.slug !== subCategorySlug
  ) {
    notFound();
  }

  const canonicalPath = buildProductHref(product);
  if (!canonicalPath.startsWith("/categories/")) {
    notFound();
  }
  redirect(canonicalPath);
}

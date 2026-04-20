import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST with header `x-cms-revalidate-secret` matching env `CMS_REVALIDATE_SECRET`
 * (set in deployment; not exposed to the browser). Pair with `getPublishedCmsPageByKey` fetch tags `cms`.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CMS_REVALIDATE_SECRET;
  if (!expected || req.headers.get("x-cms-revalidate-secret") !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    revalidateTag("cms", "max");
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

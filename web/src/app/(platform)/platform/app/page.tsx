import { PlatformRouteGuard } from "@/components/platform/core/auth/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/core/layout/PlatformShell";

export default function PlatformAppPage() {
  return (
    <PlatformRouteGuard>
      <PlatformShell>
        <section className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="text-2xl font-semibold">Platform Workspace</h1>
          <p className="mt-3 text-zinc-600">
            Day la khu vuc platform moi. Ban co the chuyen tenant o thanh top bar de kiem tra token
            flow.
          </p>
        </section>
      </PlatformShell>
    </PlatformRouteGuard>
  );
}

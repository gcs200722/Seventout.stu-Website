"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePlatformAuth } from "./PlatformAuthProvider";

export function PlatformRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, role } = usePlatformAuth();

  useEffect(() => {
    if (!loading && !role) {
      router.replace("/platform");
    }
  }, [loading, role, router]);

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Loading platform...</div>;
  }

  if (!role) {
    return null;
  }

  return <>{children}</>;
}

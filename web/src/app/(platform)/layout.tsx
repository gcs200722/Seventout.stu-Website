import type { ReactNode } from "react";
import { PlatformProviders } from "@/components/platform/core/providers/PlatformProviders";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformProviders>{children}</PlatformProviders>;
}

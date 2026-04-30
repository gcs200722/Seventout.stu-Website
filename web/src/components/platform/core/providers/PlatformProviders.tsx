"use client";

import type { ReactNode } from "react";
import { PlatformAuthProvider } from "../auth/PlatformAuthProvider";

export function PlatformProviders({ children }: { children: ReactNode }) {
  return <PlatformAuthProvider>{children}</PlatformAuthProvider>;
}

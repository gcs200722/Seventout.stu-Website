"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AddressManager } from "@/components/profile/AddressManager";

export default function AddressesPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AddressManager userId={user?.id} />
    </div>
  );
}

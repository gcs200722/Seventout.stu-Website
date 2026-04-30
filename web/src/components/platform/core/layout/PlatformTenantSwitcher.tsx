"use client";

import { useState } from "react";
import { usePlatformAuth } from "../auth/PlatformAuthProvider";

const DEMO_TENANT_IDS = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
];

export function PlatformTenantSwitcher() {
  const { activeTenantId, switchTenantById } = usePlatformAuth();
  const [value, setValue] = useState(activeTenantId ?? DEMO_TENANT_IDS[0]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSwitch = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await switchTenantById(value);
      setMessage("Đã chuyển tenant thành công.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chuyển tenant.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2">
      <select
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      >
        {DEMO_TENANT_IDS.map((tenantId) => (
          <option key={tenantId} value={tenantId}>
            {tenantId.slice(0, 8)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSwitch}
        disabled={saving}
        className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Switching..." : "Switch tenant"}
      </button>
      {message ? <span className="text-xs text-zinc-500">{message}</span> : null}
    </div>
  );
}

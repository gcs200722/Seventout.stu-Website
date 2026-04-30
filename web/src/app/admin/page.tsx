"use client";

import { useEffect, useState } from "react";

import DashboardOverview from "@/components/tenant/core/admin/dashboard/DashboardOverview";
import {
  getAdminDashboardSummary,
  type DashboardComparePreset,
  type DashboardSummary,
} from "@/lib/admin-dashboard-api";

const compareOptions: Array<{ value: DashboardComparePreset; label: string }> = [
  { value: "YESTERDAY", label: "So voi hom qua" },
  { value: "LAST_WEEK_SAME_DAY", label: "So voi cung tuan truoc" },
  { value: "AVG_LAST_7_DAYS", label: "So voi TB 7 ngay" },
];

export default function AdminDashboardPage() {
  const [compare, setCompare] = useState<DashboardComparePreset>("YESTERDAY");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const response = await getAdminDashboardSummary(compare);
        setSummary(response);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Khong tai duoc dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void loadSummary();
  }, [compare]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-stone-600">
            Dashboard van hanh chuyen nghiep cho tai khoan ADMIN va STAFF.
          </p>
        </div>

        <label className="text-sm text-stone-700">
          Muc so sanh
          <select
            value={compare}
            onChange={(event) => setCompare(event.target.value as DashboardComparePreset)}
            className="mt-1 block rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {compareOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {loading ? <p className="text-sm text-stone-500">Dang tai dashboard...</p> : null}
      {!loading && summary ? <DashboardOverview summary={summary} /> : null}
    </section>
  );
}

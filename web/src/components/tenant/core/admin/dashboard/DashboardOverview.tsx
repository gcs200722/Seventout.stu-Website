"use client";

import Link from "next/link";

import type { DashboardSummary, TrendStatus } from "@/lib/admin-dashboard-api";

type Props = {
  summary: DashboardSummary;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function statusClass(status: TrendStatus) {
  if (status === "GOOD") return "text-emerald-700";
  if (status === "BAD") return "text-rose-700";
  return "text-stone-500";
}

function formatDelta(delta: number) {
  const abs = Math.abs(delta).toFixed(2);
  if (delta > 0) return `+${abs}%`;
  if (delta < 0) return `-${abs}%`;
  return "0.00%";
}

function Sparkline({
  values,
  color = "#0f766e",
}: {
  values: number[];
  color?: string;
}) {
  const width = 160;
  const height = 42;
  const points = values.length > 1 ? values : [0, 0];
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);

  const mapped = points
    .map((value, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={mapped}
      />
    </svg>
  );
}

function MainLineChart({
  rows,
}: {
  rows: Array<{ label: string; revenue: number; orders: number }>;
}) {
  const width = 700;
  const height = 220;
  const padX = 28;
  const padY = 20;
  const maxValue = Math.max(1, ...rows.map((item) => item.revenue));
  const graphWidth = width - padX * 2;
  const graphHeight = height - padY * 2;

  const path = rows
    .map((item, idx) => {
      const x = padX + (idx / Math.max(rows.length - 1, 1)) * graphWidth;
      const y = padY + graphHeight - (item.revenue / maxValue) * graphHeight;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl bg-stone-50 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <path d={path} fill="none" stroke="#0f766e" strokeWidth="3" />
        {rows.map((item, idx) => {
          const x = padX + (idx / Math.max(rows.length - 1, 1)) * graphWidth;
          const y = padY + graphHeight - (item.revenue / maxValue) * graphHeight;
          return <circle key={item.label} cx={x} cy={y} r="3.5" fill="#0f766e" />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-[11px] text-stone-500">
        {rows.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  rows,
}: {
  rows: Array<{ status: string; count: number; percent: number }>;
}) {
  const radius = 52;
  const stroke = 20;
  const circumference = 2 * Math.PI * radius;
  const colors = ["#16a34a", "#0ea5e9", "#f59e0b", "#ef4444", "#64748b", "#a855f7"];
  const segments = rows.map((item) => (item.percent / 100) * circumference);
  const offsets = segments.map((_, idx) =>
    segments.slice(0, idx).reduce((sum, value) => sum + value, 0),
  );

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-stone-50 p-3">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <g transform="translate(80,80) rotate(-90)">
          {rows.map((item, idx) => {
            const segment = segments[idx];
            return (
              <circle
                key={item.status}
                cx="0"
                cy="0"
                r={radius}
                fill="none"
                stroke={colors[idx % colors.length]}
                strokeWidth={stroke}
                strokeDasharray={`${segment} ${circumference}`}
                strokeDashoffset={-offsets[idx]}
              />
            );
          })}
        </g>
      </svg>

      <div className="space-y-1.5 text-xs">
        {rows.map((item, idx) => (
          <p key={item.status} className="flex items-center gap-2 text-stone-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span>{item.status}</span>
            <span className="font-semibold text-stone-900">
              {item.count} ({item.percent.toFixed(1)}%)
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function iconSvg(type: "revenue" | "orders" | "aov" | "users") {
  if (type === "revenue") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }
  if (type === "orders") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }
  if (type === "aov") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M9 13c0 1.2 1.1 2 2.5 2s2.5-.8 2.5-2-1.1-2-2.5-2-2.5-.8-2.5-2 1.1-2 2.5-2 2.5.8 2.5 2" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="10" r="3" />
      <path d="M20 19a4 4 0 0 0-3-3.87M4 19a4 4 0 0 1 3-3.87" />
    </svg>
  );
}

export default function DashboardOverview({ summary }: Props) {
  const { metrics } = summary.today;
  const { trend, issues } = summary;
  const charts = summary.charts ?? {
    hourly: [],
    revenue7d: [],
    sparkline: { revenue: [], orders: [], aov: [], newCustomers: [] },
  };
  const lineData = charts.revenue7d;
  const statusDonut = summary.statusDonut ?? [];
  const recentOrders = summary.recentOrders ?? [];
  const actionQueue = summary.actionQueue ?? [];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">Doanh thu</p>
            <span className="text-teal-700">{iconSvg("revenue")}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-stone-900">{formatVnd(metrics.grossRevenue)}</p>
          <p className={`mt-1 text-xs font-semibold ${statusClass(trend.revenueStatus)}`}>
            {formatDelta(trend.revenueDeltaPercent)}
          </p>
          <Sparkline values={charts.sparkline.revenue} color="#0f766e" />
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">Tong don</p>
            <span className="text-sky-700">{iconSvg("orders")}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-stone-900">{metrics.paidOrders}</p>
          <p className={`mt-1 text-xs font-semibold ${statusClass(trend.paidOrderStatus)}`}>
            {formatDelta(trend.paidOrderDeltaPercent)}
          </p>
          <Sparkline values={charts.sparkline.orders} color="#0284c7" />
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">AOV</p>
            <span className="text-violet-700">{iconSvg("aov")}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-stone-900">{formatVnd(metrics.aov)}</p>
          <p className={`mt-1 text-xs font-semibold ${statusClass(trend.aovStatus)}`}>
            {formatDelta(trend.aovDeltaPercent)}
          </p>
          <Sparkline values={charts.sparkline.aov} color="#7c3aed" />
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">Khach hang moi</p>
            <span className="text-emerald-700">{iconSvg("users")}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-stone-900">{metrics.newCustomers}</p>
          <p className="mt-1 text-xs font-semibold text-stone-500">24h qua</p>
          <Sparkline values={charts.sparkline.newCustomers} color="#16a34a" />
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60 xl:col-span-2">
          <h2 className="text-sm font-semibold text-stone-900">Doanh thu 7 ngay qua</h2>
          <p className="mt-1 text-xs text-stone-500">
            Tong quan nhanh ve xu huong doanh thu va don hang.
          </p>
          <div className="mt-3">
            <MainLineChart rows={lineData} />
          </div>
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60">
          <h2 className="text-sm font-semibold text-stone-900">Ti le trang thai don</h2>
          <div className="mt-3">
            <DonutChart rows={statusDonut} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60 xl:col-span-2">
          <h2 className="text-sm font-semibold text-stone-900">Canh bao van hanh</h2>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Don cho xu ly qua {issues.thresholds.pendingOrdersHours}h:{" "}
              <span className="font-semibold">{issues.pendingOrdersTooLong}</span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Return cho inspection qua {issues.thresholds.returnsHours}h:{" "}
              <span className="font-semibold">{issues.returnsAwaitingInspection}</span>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Refund pending qua {issues.thresholds.refundsHours}h:{" "}
              <span className="font-semibold">{issues.refundsStuck}</span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60">
          <h2 className="text-sm font-semibold text-stone-900">Don hang gan day</h2>
          <div className="mt-3 space-y-2">
            {recentOrders.map((item) => (
              <div key={item.id} className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-700">
                <p className="font-semibold text-stone-900">#{item.id.slice(0, 8)}</p>
                <p>{formatVnd(item.totalAmount)}</p>
                <p>
                  {item.status} / {item.paymentStatus}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/60">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Hanh dong can thiet</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {actionQueue.map((action) => (
            <Link
              key={action.key}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white"
            >
              <span>{action.label}</span>
              <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] text-white">{action.count}</span>
            </Link>
          ))}
          <Link
            href="/admin/orders"
            className="inline-flex items-center rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Xem toan bo quy trinh
          </Link>
        </div>
      </section>
    </div>
  );
}

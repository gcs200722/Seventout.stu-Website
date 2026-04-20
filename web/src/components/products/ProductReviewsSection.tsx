"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  createMyReview,
  likeReviewRequest,
  listProductReviewsPublic,
  type ProductReview,
  type ProductReviewStats,
  reportReviewRequest,
} from "@/lib/reviews-api";

type Props = {
  productId: string;
  initialStats: ProductReviewStats;
  initialList: {
    items: ProductReview[];
    pagination: { page: number; limit: number; total: number };
  };
  orderIdForReview?: string;
};

function formatStars(average: number): string {
  if (!Number.isFinite(average) || average <= 0) {
    return "Chưa có đánh giá";
  }
  return `${average.toFixed(1)} / 5`;
}

export function ProductReviewsSection({
  productId,
  initialStats,
  initialList,
  orderIdForReview,
}: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [reviews, setReviews] = useState(initialList.items);
  const [total, setTotal] = useState(initialList.pagination.total);
  const [sort, setSort] = useState<"latest" | "rating" | "helpful">("latest");
  const [loadingList, setLoadingList] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formContent, setFormContent] = useState("");
  const [formMedia, setFormMedia] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    setStats(initialStats);
    setReviews(initialList.items);
    setTotal(initialList.pagination.total);
  }, [initialStats, initialList]);

  async function reloadList(nextSort: typeof sort) {
    setLoadingList(true);
    setActionMessage(null);
    try {
      const { items, pagination } = await listProductReviewsPublic(productId, {
        page: 1,
        limit: 10,
        sort: nextSort,
      });
      setReviews(items);
      setTotal(pagination.total);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Không tải lại danh sách đánh giá.");
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSortChange(next: typeof sort) {
    setSort(next);
    await reloadList(next);
  }

  async function handleSubmitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!orderIdForReview) {
      return;
    }
    setFormError(null);
    setFormBusy(true);
    try {
      const media_urls = formMedia
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await createMyReview({
        product_id: productId,
        order_id: orderIdForReview,
        rating: formRating,
        content: formContent.trim(),
        media_urls,
      });
      setFormContent("");
      setFormMedia("");
      setActionMessage("Cảm ơn bạn đã gửi đánh giá.");
      router.refresh();
      await reloadList(sort);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không gửi được đánh giá.");
    } finally {
      setFormBusy(false);
    }
  }

  async function handleLike(reviewId: string) {
    setActionMessage(null);
    try {
      await likeReviewRequest(reviewId);
      setActionMessage("Đã ghi nhận hữu ích.");
      await reloadList(sort);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Thao tác thất bại.");
    }
  }

  async function handleReport(reviewId: string, reason: "SPAM" | "OFFENSIVE" | "FAKE") {
    setActionMessage(null);
    try {
      await reportReviewRequest(reviewId, reason);
      setActionMessage("Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Không gửi được báo cáo.");
    }
  }

  const showReviewForm = Boolean(orderIdForReview) && isAuthenticated;

  return (
    <section className="mt-14 border-t border-stone-200 pt-10">
      <h2 className="text-lg font-semibold text-stone-900">Đánh giá từ khách hàng</h2>
      <p className="mt-2 text-sm text-stone-600">
        {stats.total_reviews > 0 ? (
          <>
            <span className="font-medium text-stone-900">{formatStars(stats.average_rating)}</span>
            <span className="mx-2 text-stone-400">·</span>
            <span>{stats.total_reviews} đánh giá</span>
          </>
        ) : (
          "Chưa có đánh giá nào. Hãy là người đầu tiên sau khi nhận hàng."
        )}
      </p>

      {actionMessage ? (
        <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
          {actionMessage}
        </p>
      ) : null}

      {showReviewForm ? (
        <form
          onSubmit={(e) => void handleSubmitReview(e)}
          className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
        >
          <p className="text-sm font-medium text-stone-900">Viết đánh giá (đơn đã hoàn thành)</p>
          <label className="block text-xs text-stone-600">
            Số sao
            <select
              value={formRating}
              onChange={(e) => setFormRating(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} sao
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-stone-600">
            Nội dung
            <textarea
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              placeholder="Chia sẻ trải nghiệm của bạn..."
            />
          </label>
          <label className="block text-xs text-stone-600">
            Link ảnh (tuỳ chọn, mỗi dòng hoặc cách nhau bởi dấu phẩy)
            <textarea
              value={formMedia}
              onChange={(e) => setFormMedia(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              placeholder="https://..."
            />
          </label>
          {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
          <button
            type="submit"
            disabled={formBusy || formContent.trim().length === 0}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {formBusy ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </form>
      ) : orderIdForReview && !isAuthenticated ? (
        <p className="mt-4 text-sm text-stone-600">Đăng nhập để gửi đánh giá cho đơn hàng này.</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sắp xếp</span>
        {(
          [
            ["latest", "Mới nhất"],
            ["rating", "Sao cao"],
            ["helpful", "Hữu ích"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={loadingList}
            onClick={() => void handleSortChange(value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              sort === value ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <li className="text-sm text-stone-500">Chưa có đánh giá.</li>
        ) : (
          reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-900">
                  {r.rating} sao
                  {r.is_verified_purchase ? (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      Đã mua hàng
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-stone-500">
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{r.content}</p>
              {r.media_urls?.length ? (
                <ul className="mt-2 list-inside list-disc text-xs text-stone-600">
                  {r.media_urls.map((url) => (
                    <li key={url}>
                      <a href={url} className="underline hover:text-stone-900" target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!isAuthenticated}
                  onClick={() => void handleLike(r.id)}
                  className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hữu ích ({r.helpful_count})
                </button>
                {isAuthenticated ? (
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-stone-500">Báo cáo:</span>
                    {(["SPAM", "OFFENSIVE", "FAKE"] as const).map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => void handleReport(r.id, reason)}
                        className="rounded-full border border-rose-200 px-2 py-0.5 font-medium text-rose-800 hover:bg-rose-50"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
      {total > reviews.length ? (
        <p className="mt-3 text-xs text-stone-500">Hiển thị {reviews.length} / {total} đánh giá.</p>
      ) : null}
    </section>
  );
}

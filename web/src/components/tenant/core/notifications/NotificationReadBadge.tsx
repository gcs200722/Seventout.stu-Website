export default function NotificationReadBadge({ isRead }: { isRead: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        isRead
          ? "border-stone-200 bg-stone-50 text-stone-600"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {isRead ? "Đã đọc" : "Chưa đọc"}
    </span>
  );
}

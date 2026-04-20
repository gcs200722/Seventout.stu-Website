export function CmsHomePreviewBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950">
      Bạn đang xem bản preview CMS (có thể gồm section/block đang tắt). Đóng tab hoặc bỏ query{" "}
      <code className="rounded bg-amber-200/80 px-1">cms_preview_token</code> để quay về bản công khai.
    </div>
  );
}

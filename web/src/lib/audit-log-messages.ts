/** Nhãn vai trò người thực hiện (UI tiếng Việt) */
export function auditActorRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "STAFF":
      return "Nhân viên";
    case "USER":
      return "Người dùng";
    case "SYSTEM":
      return "Hệ thống";
    default:
      return role || "—";
  }
}

/** Tên loại đối tượng */
export function auditEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "AUTH":
      return "Xác thực";
    case "USER":
      return "Người dùng";
    case "ORDER":
      return "Đơn hàng";
    case "PRODUCT":
      return "Sản phẩm";
    case "CATEGORY":
      return "Danh mục";
    case "PROMOTION":
      return "Khuyến mãi";
    case "INVENTORY":
      return "Tồn kho";
    case "PAYMENT":
      return "Thanh toán";
    default:
      return entityType || "—";
  }
}

/** Tên hành động ngắn (dùng trong modal) */
export function auditActionShortLabel(action: string): string {
  switch (action) {
    case "LOGIN":
      return "Đăng nhập";
    case "LOGOUT":
      return "Đăng xuất";
    case "CREATE":
      return "Tạo mới";
    case "UPDATE":
      return "Cập nhật";
    case "DELETE":
      return "Xóa";
    case "STATUS_CHANGE":
      return "Đổi trạng thái";
    case "CANCEL":
      return "Hủy";
    case "REFUND":
      return "Hoàn tiền";
    case "ROLE_ASSIGN":
      return "Gán vai trò";
    case "PERMISSION_CHANGE":
      return "Đổi quyền";
    case "ADJUST":
      return "Điều chỉnh";
    case "SYNC":
      return "Đồng bộ";
    case "APPLY":
      return "Áp dụng";
    case "PRICE_CHANGE":
      return "Đổi giá";
    case "INVENTORY_ADJUST":
      return "Điều chỉnh tồn";
    case "INVENTORY_DEDUCT":
      return "Trừ tồn (đơn)";
    case "INVENTORY_RESTOCK":
      return "Hoàn tồn";
    case "INVENTORY_SYNC":
      return "Đồng bộ tồn";
    default:
      return action || "—";
  }
}

function pickString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta || typeof meta !== "object") return null;
  const v = meta[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

type AuditRowLike = {
  action: string;
  entity_type: string;
  actor_role: string;
  metadata?: Record<string, unknown> | null;
};

/**
 * Câu mô tả một dòng (danh sách / tooltip).
 * Kết hợp actor + action + entity theo ngữ cảnh tiếng Việt.
 */
export function describeAuditLog(row: AuditRowLike): string {
  const baseWho = auditActorRoleLabel(row.actor_role);
  const actorEmail = pickString(row.metadata, "actor_email");
  const who =
    actorEmail && row.actor_role !== "SYSTEM"
      ? `${baseWho} (${actorEmail})`
      : baseWho;
  const entity = auditEntityTypeLabel(row.entity_type);
  const { action, entity_type: et } = row;
  const label = pickString(row.metadata, "entity_label");
  const tail = label ? ` · ${label}` : "";
  const finish = (msg: string): string => msg + tail;

  if (et === "AUTH") {
    if (action === "LOGIN") return finish(`${who} đã đăng nhập hệ thống`);
    if (action === "LOGOUT") return finish(`${who} đã đăng xuất`);
  }

  if (et === "ORDER") {
    if (action === "CREATE") return finish(`${who} đã tạo đơn hàng`);
    if (action === "CANCEL") return finish(`${who} đã hủy đơn hàng`);
    if (action === "STATUS_CHANGE")
      return finish(
        row.actor_role === "SYSTEM"
          ? "Hệ thống đã cập nhật trạng thái đơn hàng"
          : `${who} đã thay đổi trạng thái đơn hàng`,
      );
  }

  if (et === "USER") {
    if (action === "DELETE") return finish(`${who} đã xóa (soft) người dùng`);
    if (action === "UPDATE") return finish(`${who} đã cập nhật hồ sơ người dùng`);
    if (action === "ROLE_ASSIGN") return finish(`${who} đã gán vai trò người dùng`);
    if (action === "PERMISSION_CHANGE")
      return finish(`${who} đã thay đổi quyền người dùng`);
  }

  if (action === "CREATE") return finish(`${who} đã tạo ${entity.toLowerCase()}`);
  if (action === "UPDATE") return finish(`${who} đã cập nhật ${entity.toLowerCase()}`);
  if (action === "DELETE") return finish(`${who} đã xóa ${entity.toLowerCase()}`);

  return finish(`${who}: ${auditActionShortLabel(action)} · ${entity}`);
}

/** Giờ:phút cho cột bảng */
export function formatAuditTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/** Ngày giờ đầy đủ (modal) */
export function formatAuditDateTimeFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/** Gợi ý thiết bị từ User-Agent (đơn giản, không cần thư viện ngoài) */
export function formatUserAgentHint(userAgent: string | null | undefined): string {
  if (!userAgent || !userAgent.trim()) return "—";
  const ua = userAgent;
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
  if (/Chrome\//i.test(ua)) return "Google Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/MSIE |Trident\//i.test(ua)) return "Internet Explorer";
  return ua.length > 80 ? `${ua.slice(0, 77)}…` : ua;
}

export function auditMetadataActorEmail(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return pickString(metadata, "actor_email");
}

export function auditMetadataEntityLabel(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return pickString(metadata, "entity_label");
}

export function auditMetadataIp(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return pickString(metadata, "ip");
}

export function auditMetadataUserAgent(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return pickString(metadata, "user_agent");
}

export function auditMetadataSource(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return pickString(metadata, "source");
}

export function auditMetadataSourceLabel(
  metadata: Record<string, unknown> | null | undefined,
): string {
  const s = auditMetadataSource(metadata);
  if (!s) return "—";
  if (s === "http") return "HTTP (ứng dụng web)";
  if (s === "system") return "Hệ thống / tự động";
  if (s === "cron") return "Lịch (cron)";
  if (s === "outbox") return "Hàng đợi nội bộ";
  return s;
}

/** Một dòng gợi ý cho bảng: [giờ] mô tả đầy đủ (có thể có IP) */
export function formatAuditTableLine(row: {
  action: string;
  entity_type: string;
  actor_role: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): string {
  const t = formatAuditTimeShort(row.created_at);
  const summary = describeAuditLog(row);
  const ip = auditMetadataIp(row.metadata);
  const ipPart = ip ? ` · IP: ${ip}` : "";
  return `[${t}] ${summary}${ipPart}`;
}

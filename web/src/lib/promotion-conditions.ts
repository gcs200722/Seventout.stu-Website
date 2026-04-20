import { formatVnd } from "@/lib/products-api";

export type PromotionConditionsDisplay = {
  min_quantity: number | null;
  min_order_value: number | null;
  scoped_to_products?: boolean;
  scoped_to_categories?: boolean;
};

/**
 * Vietnamese copy: product/category scope vs whole cart, plus order thresholds.
 * Min-quantity is total units in cart, not distinct SKUs.
 */
export function promotionConditionsHintVi(
  display: PromotionConditionsDisplay | undefined,
): string | null {
  if (!display) {
    return null;
  }
  const parts: string[] = [];
  const byProducts = Boolean(display.scoped_to_products);
  const byCategories = Boolean(display.scoped_to_categories);

  if (byProducts && byCategories) {
    parts.push(
      "Giảm được tính trên tổng tiền các dòng sản phẩm hoặc danh mục nằm trong danh sách khuyến mãi trong giỏ (các món khác không được tính vào phần giảm này).",
    );
  } else if (byProducts) {
    parts.push(
      "Giảm được tính trên tổng tiền các dòng sản phẩm nằm trong danh sách khuyến mãi trong giỏ (các món khác không được tính vào phần giảm này).",
    );
  } else if (byCategories) {
    parts.push(
      "Giảm được tính trên tổng tiền các dòng thuộc danh mục được chọn trong giỏ (các món ngoài danh mục đó không được tính vào phần giảm này).",
    );
  }

  if (display.min_order_value != null && display.min_order_value > 0) {
    parts.push(`Tạm tính giỏ từ ${formatVnd(display.min_order_value)}.`);
  }
  if (display.min_quantity != null && display.min_quantity > 0) {
    parts.push(
      `Tối thiểu ${display.min_quantity} món trong giỏ là tổng số lượng (cộng dồn từng dòng; nhiều món cùng một sản phẩm vẫn được tính, không bắt buộc ${display.min_quantity} mã sản phẩm khác nhau).`,
    );
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" ");
}

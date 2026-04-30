import type { ReactNode } from "react";

const PADDING_TOP: Record<string, string> = {
  none: "",
  sm: "pt-8 sm:pt-10",
  md: "pt-12 sm:pt-16",
  lg: "pt-16 sm:pt-24",
};

const PADDING_BOTTOM: Record<string, string> = {
  none: "",
  sm: "pb-8 sm:pb-10",
  md: "pb-12 sm:pb-16",
  lg: "pb-16 sm:pb-24",
};

const MAX_WIDTH_MAP: Record<string, string> = {
  narrow: "max-w-3xl mx-auto w-full px-4 sm:px-6",
  standard: "max-w-5xl mx-auto w-full px-4 sm:px-6",
  wide: "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8",
  full: "w-full max-w-none mx-auto",
};

type SectionShellProps = {
  layout: Record<string, unknown>;
  sectionId: string;
  sectionType: string;
  /** Optional primary block id for analytics (`data-cms-block-id`). */
  analyticsBlockId?: string;
  children: ReactNode;
};

/**
 * Maps CMS `layout` JSON (snake_case keys) to spacing / width utilities.
 * Unknown keys are ignored so the JSON stays forward-compatible.
 */
export function SectionShell({
  layout,
  sectionId,
  sectionType,
  analyticsBlockId,
  children,
}: SectionShellProps) {
  const anchor =
    typeof layout.anchor_id === "string" && layout.anchor_id.trim().length > 0
      ? layout.anchor_id.trim()
      : sectionId;

  const ptKey = String(layout.padding_top ?? "md");
  const pbKey = String(layout.padding_bottom ?? "md");
  const maxKey = String(layout.max_width ?? "full");
  const paddingClass =
    sectionType === "HERO"
      ? ""
      : [PADDING_TOP[ptKey] ?? PADDING_TOP.md, PADDING_BOTTOM[pbKey] ?? PADDING_BOTTOM.md]
          .filter(Boolean)
          .join(" ");
  const widthClass = MAX_WIDTH_MAP[maxKey] ?? MAX_WIDTH_MAP.full;

  const bg =
    typeof layout.background_color === "string" && layout.background_color.trim().length > 0
      ? layout.background_color.trim()
      : undefined;

  const theme = String(layout.theme ?? "light");
  const themeClass =
    theme === "dark" ? "text-sevenout-white [&_h2]:text-sevenout-white [&_p]:text-white/80" : "";

  return (
    <div
      id={anchor}
      data-cms-section-id={sectionId}
      data-cms-section-type={sectionType}
      {...(analyticsBlockId ? { "data-cms-block-id": analyticsBlockId } : {})}
      className={`relative ${themeClass}`.trim()}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <div className={sectionType === "HERO" ? "w-full" : `${widthClass} ${paddingClass}`.trim()}>{children}</div>
    </div>
  );
}

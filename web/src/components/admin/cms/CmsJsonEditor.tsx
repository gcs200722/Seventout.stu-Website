"use client";

import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.min.css";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightJson(code: string): string {
  try {
    return Prism.highlight(code, Prism.languages.json, "json");
  } catch {
    return `<span class="token comment">Không highlight được (JSON đang sửa).</span><br/><span class="token string">${escapeHtml(code.slice(0, 2000))}</span>`;
  }
}

type CmsJsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function CmsJsonEditor({ value, onChange, disabled, "aria-label": ariaLabel }: CmsJsonEditorProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-stone-700 bg-stone-950 shadow-inner ring-1 ring-stone-800/80"
      role="textbox"
      aria-label={ariaLabel ?? "Chỉnh sửa JSON block"}
    >
      <Editor
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        highlight={highlightJson}
        padding={16}
        className="min-h-[12rem] font-mono text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_textarea]:!outline-none"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          backgroundColor: "#0c0a09",
          color: "#e7e5e4",
        }}
      />
    </div>
  );
}

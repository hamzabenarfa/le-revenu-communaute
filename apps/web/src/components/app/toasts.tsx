"use client";

import type { ReactNode } from "react";

export interface ToastItem {
  id: number;
  content: ReactNode;
  className?: string;
  out?: boolean;
}

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div id="toasts" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast${t.className ? ` ${t.className}` : ""}${t.out ? " out" : ""}`}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}

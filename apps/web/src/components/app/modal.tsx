"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { Icon } from "../icon";

/** Prototype modal: blurred overlay, Escape and outside click close, focus moves inside. */
export function Modal({
  title,
  extra,
  size,
  onClose,
  children,
}: {
  title: string;
  extra?: ReactNode;
  size?: "sm";
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the effect: re-running it would pull focus out of the dialog mid-typing.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // As on the prototype: an [autofocus] field, else the first field — never the close button.
    const first =
      ref.current?.querySelector<HTMLElement>("[autofocus]") ??
      ref.current?.querySelector<HTMLElement>(
        ".m-body input:not([type=hidden]):not(.sr-file), .m-body textarea, .m-body select",
      ) ??
      ref.current?.querySelector<HTMLElement>(".m-body button");
    // Never steal focus from a field the member already clicked into.
    const timer = setTimeout(() => {
      if (!ref.current?.contains(document.activeElement)) first?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking the backdrop closes the dialog; Escape does the same from the keyboard
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users close with Escape (handled above)
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && close.current()}
    >
      <div
        ref={ref}
        className={`modal${size ? ` ${size}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="m-head">
          <h2>
            {title} {extra}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={() => close.current()}
            aria-label="Fermer"
          >
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

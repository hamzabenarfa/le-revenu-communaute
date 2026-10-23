"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { loadMentions } from "@/app/actions/community";
import { untrustedHosts } from "@/lib/links";
import type { Person } from "@/lib/strapi/types";
import { Avatar } from "../atoms";
import { Icon } from "../icon";
import { useApp } from "./app-context";

interface MentionState {
  start: number;
  q: string;
  items: Array<Person & { near: boolean }>;
  index: number;
  x: number;
  y: number;
}

/** Caret position: copy the text before the caret into an invisible mirror with the same styles. */
function caretPoint(ta: HTMLTextAreaElement) {
  const cs = getComputedStyle(ta);
  const mirror = document.createElement("div");
  for (const p of [
    "boxSizing",
    "width",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderLeftWidth",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
  ] as const) {
    mirror.style[p] = cs[p];
  }
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    top: "0",
    left: "-9999px",
  });
  mirror.textContent = ta.value.slice(0, ta.selectionStart);
  const mark = document.createElement("span");
  mark.textContent = "​";
  mirror.appendChild(mark);
  document.body.appendChild(mirror);
  const rect = ta.getBoundingClientRect();
  const lh =
    Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.4;
  const point = {
    x: rect.left + mark.offsetLeft - ta.scrollLeft,
    y: rect.top + mark.offsetTop - ta.scrollTop + lh,
  };
  mirror.remove();
  return point;
}

/** Live feedback on links, as on the prototype: trusted, held for moderation, or refused at this level. */
export function LinkNote({
  text,
  canPostExternal,
}: {
  text: string;
  canPostExternal: boolean;
}) {
  if (!/\.[a-z]{2,}/i.test(text)) return null;
  const hasLinks =
    /\b(?:https?:\/\/|www\.)|\b[a-z0-9-]+\.(?:com|fr|net|org|eu|io|info|be|ch|co)\b/i.test(
      text,
    );
  if (!hasLinks) return null;
  const bad = untrustedHosts(text);
  if (!bad.length)
    return (
      <div className="link-note ln-ok" aria-live="polite">
        <Icon name="check" />
        <span>Lien vers une source de confiance : il sera cliquable.</span>
      </div>
    );
  if (canPostExternal)
    return (
      <div className="link-note ln-warn" aria-live="polite">
        <Icon name="shield" />
        <span>
          Le lien vers <b>{bad.join(", ")}</b> sera vérifié par la modération
          avant d&apos;être cliquable.
        </span>
      </div>
    );
  return (
    <div className="link-note ln-bad" aria-live="polite">
      <Icon name="shield" />
      <span>
        Les liens vers <b>{bad.join(", ")}</b> ne sont pas autorisés à votre
        niveau. Sont acceptés : lerevenu.com, les sites publics (.gouv.fr,
        service-public.fr), l&apos;AMF, la Banque de France, l&apos;Insee et la
        Cour des comptes. <a href="/charte">Pourquoi ?</a>
      </span>
    </div>
  );
}

export function useCanPostExternal() {
  const { me } = useApp();
  return Boolean(me && (me.staff || me.level.index >= 3));
}

/** Members may not post untrusted links below "Contributeur averti" (the server enforces the same rule). */
export function linksBlocked(text: string, canPostExternal: boolean) {
  return !canPostExternal && untrustedHosts(text).length > 0;
}

export function MentionTextarea({
  id,
  value,
  onChange,
  context,
  placeholder,
  rows,
  className,
  invalid,
  describedBy,
  textareaRef,
  onSubmitShortcut,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  context: string[];
  placeholder?: string;
  rows?: number;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onSubmitShortcut?: () => void;
}) {
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? own;
  const [mention, setMention] = useState<MentionState | null>(null);
  const request = useRef(0);

  const check = useCallback(
    async (ta: HTMLTextAreaElement) => {
      const before = ta.value.slice(0, ta.selectionStart);
      const m = before.match(/(^|[\s(])@([\p{L}\p{N}_.-]{0,24})$/u);
      if (!m) {
        setMention(null);
        return;
      }
      const ticket = ++request.current;
      const result = await loadMentions(m[2], context);
      if (ticket !== request.current || !result.ok) return;
      const point = caretPoint(ta);
      setMention({
        start: ta.selectionStart - m[2].length - 1,
        q: m[2],
        items: result.data,
        index: 0,
        x: point.x,
        y: point.y,
      });
    },
    [context],
  );

  const pick = (k: number) => {
    const ta = ref.current;
    if (!mention || !ta) return;
    const item = mention.items[k];
    if (!item) return;
    const insert = `@${item.username} `;
    const next =
      ta.value.slice(0, mention.start) +
      insert +
      ta.value.slice(ta.selectionStart);
    const caret = mention.start + insert.length;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention?.items.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = mention.items.length;
        setMention({
          ...mention,
          index: (mention.index + (e.key === "ArrowDown" ? 1 : -1) + n) % n,
        });
        return;
      }
      if ((e.key === "Enter" && !e.ctrlKey && !e.metaKey) || e.key === "Tab") {
        e.preventDefault();
        pick(mention.index);
        return;
      }
    }
    if (mention && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setMention(null);
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmitShortcut?.();
    }
  };

  // Re-evaluate on every value change (typing, "Mentionner" button, picked suggestion).
  useEffect(() => {
    const ta = ref.current;
    if (ta && document.activeElement === ta && value !== undefined)
      void check(ta);
  }, [value, check, ref]);

  useEffect(() => {
    if (!mention) return;
    const close = () => setMention(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [mention]);

  return (
    <>
      <textarea
        ref={ref}
        id={id}
        className={className}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            void check(e.currentTarget);
        }}
        onBlur={() => setTimeout(() => setMention(null), 150)}
      />
      {mention && (
        <div
          className="mention-pop"
          role="listbox"
          aria-label="Mentionner un membre"
          style={{
            left: Math.max(
              8,
              Math.min(mention.x - 14, window.innerWidth - 288),
            ),
            top: mention.y + 6,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mp-head">
            {mention.q
              ? `Membres correspondant à « ${mention.q} »`
              : "Mentionner un membre"}
          </div>
          {mention.items.length ? (
            mention.items.map((u, k) => (
              <button
                key={u.username}
                type="button"
                className={`mp-item${k === mention.index ? " on" : ""}`}
                role="option"
                aria-selected={k === mention.index}
                onClick={() => pick(k)}
              >
                <Avatar person={u} size="sm" link={false} />
                <span>
                  <b>{u.name}</b>
                  <small>
                    @{u.username}
                    {u.role === "redaction"
                      ? " · Rédaction"
                      : u.near
                        ? " · dans cette page"
                        : ""}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <div className="mp-empty">Aucun membre ne correspond.</div>
          )}
        </div>
      )}
    </>
  );
}

/** "@ Mentionner" button: inserts an @ at the caret and opens the list. */
export function insertAt(
  ta: HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
) {
  if (!ta) return;
  const p = ta.selectionStart ?? value.length;
  const before = value.slice(0, p);
  const insert = `${before && !/\s$/.test(before) ? " " : ""}@`;
  onChange(before + insert + value.slice(ta.selectionEnd ?? p));
  requestAnimationFrame(() => {
    ta.focus();
    const caret = p + insert.length;
    ta.setSelectionRange(caret, caret);
  });
}

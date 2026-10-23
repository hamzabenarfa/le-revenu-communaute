import Link from "next/link";
import type { ReactNode } from "react";
import { cleanLink, hostOf, isTrusted, LINK_RE, parseLink } from "@/lib/links";

/**
 * Renders member text like the prototype's formatBody: paragraphs, "- " lists,
 * **bold**, @mentions and links. Everything is built as React elements, so
 * user content is never interpreted as HTML.
 */
const TOKEN_RE = new RegExp(
  `(${LINK_RE.source})|\\*\\*(.+?)\\*\\*|(^|[\\s(])@([A-Za-z0-9_\\-]+(?:\\.[A-Za-z0-9_\\-]+)*)`,
  "gi",
);

function renderLink(raw: string, key: string): ReactNode[] {
  const url = cleanLink(raw);
  const rest = raw.slice(url.length);
  const host = hostOf(url);
  const shown = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const parsed = parseLink(url);
  // The href is rebuilt from the parsed URL, so what is clicked is exactly the host that was checked.
  const node =
    parsed && isTrusted(host) ? (
      <a
        key={key}
        className="ugc-link"
        href={`${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`}
        target="_blank"
        rel="ugc nofollow noopener noreferrer"
      >
        {shown.length > 48 ? `${shown.slice(0, 46)}…` : shown}
      </a>
    ) : (
      <span
        key={key}
        className="link-pending"
        title="Lien en attente de validation par la modération"
      >
        {url}
        <small> · lien en attente de validation</small>
      </span>
    );
  return rest ? [node, rest] : [node];
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyBase}-${i++}`;
    if (m[1]) out.push(...renderLink(m[1], key));
    else if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[4]) {
      if (m[3]) out.push(m[3]);
      out.push(
        <Link
          key={key}
          className="mention"
          href={`/membres/${encodeURIComponent(m[4])}`}
          data-u={m[4]}
        >
          @{m[4]}
        </Link>,
      );
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function withBreaks(lines: string[], key: string): ReactNode[] {
  // Keys are positions in a static text: they never reorder.
  return lines.flatMap((line, i) => {
    const parts = inline(line, `${key}-${i}`);
    if (!i) return parts;
    // biome-ignore lint/suspicious/noArrayIndexKey: position in a static text is its identity
    return [<br key={`${key}-br${i}`} />, ...parts];
  });
}

export function Prose({
  text,
  className = "prose",
}: {
  text: string;
  className?: string;
}) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const items = lines.filter((l) => /^- /.test(l));
        const head = lines.filter((l) => !/^- /.test(l));
        const key = `b${b}`;
        const list = items.length ? (
          <ul key={`${key}-ul`}>
            {items.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static text rendered once; position is the identity
              <li key={`${key}-li${i}`}>
                {inline(l.slice(2), `${key}-li${i}`)}
              </li>
            ))}
          </ul>
        ) : null;
        if (!head.length) return list;
        return [<p key={`${key}-p`}>{withBreaks(head, key)}</p>, list];
      })}
    </div>
  );
}

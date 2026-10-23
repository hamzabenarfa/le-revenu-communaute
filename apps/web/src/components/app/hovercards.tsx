"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadMemberCard } from "@/app/actions/community";
import type { MemberCard } from "@/lib/strapi/types";
import { Avatar, profileHref, RoleTags } from "../atoms";
import { Icon } from "../icon";

/** Member card on hover of any [data-u] element (avatars, names, mentions). Mouse only. */
export function HoverCards() {
  const [card, setCard] = useState<{
    data: MemberCard;
    x: number;
    y: number;
  } | null>(null);
  const cache = useRef(new Map<string, MemberCard | null>());
  const timers = useRef<{
    show?: ReturnType<typeof setTimeout>;
    hide?: ReturnType<typeof setTimeout>;
  }>({});
  const anchor = useRef<Element | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const over = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(".hovercard")) {
        clearTimeout(timers.current.hide);
        return;
      }
      const a = target.closest("[data-u]");
      if (!a) return;
      clearTimeout(timers.current.hide);
      if (a === anchor.current) return;
      clearTimeout(timers.current.show);
      timers.current.show = setTimeout(async () => {
        const username = a.getAttribute("data-u") ?? "";
        if (!cache.current.has(username)) {
          const result = await loadMemberCard(username);
          cache.current.set(username, result.ok ? result.data : null);
        }
        const data = cache.current.get(username);
        if (!data || !document.body.contains(a)) return;
        anchor.current = a;
        const r = a.getBoundingClientRect();
        const h = 260;
        setCard({
          data,
          x: Math.max(8, Math.min(r.left, window.innerWidth - 308)),
          y:
            r.bottom + 8 + h > window.innerHeight - 8
              ? Math.max(8, r.top - h - 8)
              : r.bottom + 8,
        });
      }, 400);
    };
    const out = (e: MouseEvent) => {
      const from = (e.target as Element).closest("[data-u], .hovercard");
      if (
        !from ||
        (e.relatedTarget instanceof Node && from.contains(e.relatedTarget))
      )
        return;
      clearTimeout(timers.current.show);
      timers.current.hide = setTimeout(() => {
        anchor.current = null;
        setCard(null);
      }, 250);
    };
    const hide = () => {
      anchor.current = null;
      setCard(null);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      document.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!card) return null;
  const u = card.data;
  const member = u.role === "member";
  return (
    <div
      className="hovercard"
      role="dialog"
      aria-label={`Fiche de ${u.name}`}
      style={{ left: card.x, top: card.y }}
    >
      <div className="hc-head">
        <Avatar person={u} size="lg" link={false} />
        <div>
          <b>{u.name}</b>
          <small>@{u.username}</small>
        </div>
      </div>
      <div className="hc-tags">
        <RoleTags person={{ ...u, level: member ? u.level : null }} />
      </div>
      {u.pro && (
        <p className="hc-pro">
          <Icon name="verified" />
          <span>
            <b>{u.pro}</b>
            <small>Expertise vérifiée par l&apos;équipe du Revenu</small>
          </span>
        </p>
      )}
      {u.bio && <p className="hc-bio">{u.bio}</p>}
      {member ? (
        <div className="hc-stats">
          <span>
            <b>{u.since}</b>membre depuis
          </span>
          <span>
            <b>{u.replies}</b>réponses
          </span>
          <span>
            <b>{u.solutions}</b>meilleures réponses
          </span>
        </div>
      ) : (
        <div className="hc-stats" style={{ gridTemplateColumns: "1fr" }}>
          <span>
            <b>Compte officiel</b>géré par l&apos;équipe du Revenu
          </span>
        </div>
      )}
      <Link
        className="btn btn-secondary btn-sm btn-block"
        href={profileHref(u.username)}
      >
        Voir le profil
      </Link>
    </div>
  );
}

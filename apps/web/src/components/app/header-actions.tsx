"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import { loadNotifications, readNotifications } from "@/app/actions/community";
import { ago } from "@/lib/format";
import type { Notification } from "@/lib/strapi/types";
import { Avatar, BADGES } from "../atoms";
import { Icon, type IconName } from "../icon";
import { useApp } from "./app-context";

const NOTIF_ICON: Record<Notification["kind"], [string, IconName]> = {
  reply: ["ic-like", "msg"],
  like: ["ic-like", "thumb"],
  mention: ["ic-like", "msg"],
  badge: ["ic-badge", "star"],
  solution: ["ic-ok", "check"],
  level: ["ic-badge", "trophy"],
  event: ["ic-ok", "cal"],
};

function useOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

export function NotificationsMenu({ onClose }: { onClose: () => void }) {
  const { handle } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    void loadNotifications().then((r) => setItems(handle(r) ?? []));
  }, [handle]);

  const open = async (n: Notification) => {
    if (!n.read) void readNotifications(n.documentId);
    onClose();
    router.push(
      n.href ??
        (n.kind === "badge" || n.kind === "level" ? "/membres/moi" : "/"),
    );
  };

  return (
    <div className="dropdown" role="dialog" aria-label="Notifications">
      <div className="dd-head">
        <b>Notifications</b>
        <button
          type="button"
          onClick={async () => {
            await readNotifications(null);
            setItems(
              (list) => list?.map((n) => ({ ...n, read: true })) ?? null,
            );
          }}
        >
          Tout marquer comme lu
        </button>
      </div>
      {items === null ? (
        <div className="empty">
          <p>Chargement…</p>
        </div>
      ) : items.length ? (
        items.map((n) => {
          const [cls, icon] = NOTIF_ICON[n.kind];
          return (
            <button
              type="button"
              key={n.documentId}
              className={`notif${n.read ? "" : " unread"}`}
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => void open(n)}
            >
              {n.actor ? (
                <Avatar person={n.actor} size="sm" link={false} />
              ) : (
                <span className={`ic ${cls}`}>
                  <Icon
                    name={
                      n.badge && BADGES[n.badge.code]
                        ? BADGES[n.badge.code].icon
                        : icon
                    }
                  />
                </span>
              )}
              <div>
                {n.actor && <b>{n.actor.name} </b>}
                {n.text}
                <small>{ago(n.createdAt)}</small>
              </div>
            </button>
          );
        })
      ) : (
        <div className="empty">
          <p>Aucune notification pour l&apos;instant.</p>
        </div>
      )}
    </div>
  );
}

export function HeaderActions() {
  const {
    me,
    requireLogin,
    openComposer,
    openBlogEditor,
    openPhoto,
    openOnboarding,
  } = useApp();
  const [menu, setMenu] = useState<"notifs" | "me" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, menu !== null, () => setMenu(null));

  return (
    <div className="hdr-act" ref={ref}>
      <Link
        className="icon-btn search-mobile"
        href="/recherche"
        aria-label="Rechercher"
      >
        <Icon name="search" />
      </Link>
      {me ? (
        <>
          <button
            type="button"
            className="btn btn-primary hdr-compose"
            onClick={() => openComposer()}
          >
            <Icon name="plus" />
            Publier
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={
              me.unread
                ? `Notifications (${me.unread} non lues)`
                : "Notifications"
            }
            aria-expanded={menu === "notifs"}
            onClick={() => setMenu(menu === "notifs" ? null : "notifs")}
          >
            <Icon name="bell" />
            {me.unread > 0 && <span className="dot-count">{me.unread}</span>}
          </button>
          <button
            type="button"
            className="me-btn"
            aria-label="Mon compte"
            aria-expanded={menu === "me"}
            onClick={() => setMenu(menu === "me" ? null : "me")}
          >
            <Avatar person={me} size="sm" link={false} />
            <span className="me-pts num">{me.points} pts</span>
          </button>
          {menu === "notifs" && (
            <NotificationsMenu onClose={() => setMenu(null)} />
          )}
          {menu === "me" && (
            <div className="dropdown" style={{ width: 270 }}>
              <div className="menu-me">
                <Avatar person={me} size="md" link={false} />
                <div>
                  <b>{me.name}</b>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {me.level.name} · <span className="num">{me.points}</span>{" "}
                    pts
                  </div>
                </div>
              </div>
              <div className="menu-list">
                <Link
                  href={`/membres/${encodeURIComponent(me.username)}`}
                  onClick={() => setMenu(null)}
                >
                  <Icon name="user" />
                  Mon profil et mes badges
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    openBlogEditor();
                  }}
                >
                  <Icon name="pen" />
                  Écrire un billet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    openPhoto();
                  }}
                >
                  <Icon name="camera" />
                  Changer ma photo
                </button>
                <Link href="/classement" onClick={() => setMenu(null)}>
                  <Icon name="trophy" />
                  Classement
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    openOnboarding(true);
                  }}
                >
                  <Icon name="spark" />
                  Pseudo et centres d&apos;intérêt
                </button>
                <a
                  href="https://www.lerevenu.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="news" />
                  Retour sur lerevenu.com
                </a>
                <form action={logout}>
                  <button type="submit">
                    <Icon name="out" />
                    Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => requireLogin()}
          >
            Se connecter
          </button>
          <button
            type="button"
            className="btn btn-primary hdr-compose"
            onClick={() => requireLogin()}
          >
            Rejoindre
          </button>
        </>
      )}
    </div>
  );
}

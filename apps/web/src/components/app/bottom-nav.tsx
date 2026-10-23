"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "../icon";
import { useApp } from "./app-context";
import { NotificationsMenu } from "./header-actions";

/** Mobile bottom bar: home, spaces, central publish button, activity, profile. */
export function BottomNav() {
  const { me, requireLogin, openComposer } = useApp();
  const pathname = usePathname();
  const [notifs, setNotifs] = useState(false);
  const on = (test: boolean) => (test ? "on" : undefined);
  const profileHref = me ? `/membres/${encodeURIComponent(me.username)}` : null;

  return (
    <nav className="bnav" aria-label="Navigation mobile">
      <Link href="/" className={on(pathname === "/")}>
        <Icon name="home" />
        Accueil
      </Link>
      <Link href="/espaces" className={on(pathname.startsWith("/espaces"))}>
        <Icon name="grid" />
        Espaces
      </Link>
      <button type="button" aria-label="Publier" onClick={() => openComposer()}>
        <span className="plus">
          <Icon name="plus" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => requireLogin(() => setNotifs((v) => !v))}
      >
        <Icon name="bell" />
        Activité
        {me && me.unread > 0 && <span className="dot-count">{me.unread}</span>}
      </button>
      {profileHref ? (
        <Link href={profileHref} className={on(pathname === profileHref)}>
          <Icon name="user" />
          Profil
        </Link>
      ) : (
        <button type="button" onClick={() => requireLogin()}>
          <Icon name="user" />
          Connexion
        </button>
      )}
      {notifs && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: 76 }}>
          <NotificationsMenu onClose={() => setNotifs(false)} />
        </div>
      )}
    </nav>
  );
}

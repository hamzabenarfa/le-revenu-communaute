import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { StrapiError } from "@/lib/strapi/errors";
import { listSpaces } from "@/lib/strapi/spaces";
import type { Space } from "@/lib/strapi/types";
import { AppProvider } from "./app/app-context";
import { BottomNav } from "./app/bottom-nav";
import { HeaderActions } from "./app/header-actions";
import { HeaderSearch } from "./app/header-search";
import { HoverCards } from "./app/hovercards";
import { ModalHost } from "./app/modals";
import { QueryProvider } from "./app/query-provider";
import { SpaceIcon, spaceHref } from "./atoms";
import { Icon } from "./icon";
import { FeedSkeleton } from "./skeletons";

const SITE = "https://www.lerevenu.com";
const SITE_NAV = [
  "Bourse",
  "Économie",
  "Placements",
  "Immobilier",
  "Impôts",
  "Succession",
  "Vie pratique",
];

const SiteLink = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <a
    className={className}
    href={SITE}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

/** Thin bar back to lerevenu.com, its sections and the magazine (not sticky). */
export function SiteBar({ subscriber = false }: { subscriber?: boolean }) {
  return (
    <div className="sitebar">
      <div className="wrap">
        <SiteLink className="sb-back">
          <Icon name="arrowL" />
          Retour sur lerevenu.com
        </SiteLink>
        <nav className="sb-links" aria-label="Rubriques de lerevenu.com">
          {SITE_NAV.map((r) => (
            <SiteLink key={r}>{r}</SiteLink>
          ))}
        </nav>
        <span className="sb-right">
          <SiteLink className="sb-mag">
            <Icon name="book" />
            Le magazine
          </SiteLink>
          <SiteLink className={`sb-sub${subscriber ? " on" : ""}`}>
            {subscriber ? "Mon abonnement" : "S'abonner"}
          </SiteLink>
        </span>
      </div>
    </div>
  );
}

export function Brand() {
  return (
    <Link
      className="brand"
      href="/"
      aria-label="Le Revenu, accueil de la communauté"
    >
      <span className="lr-logo" aria-hidden="true">
        <span className="lr-le">LE</span>
        <span>REVENU</span>
      </span>
      <span className="brand-sep" />
      <span className="brand-sub">Communauté</span>
    </Link>
  );
}

/** Same search box without the current query (static shell). */
function SearchFallback() {
  return (
    <form className="search" action="/recherche">
      <Icon name="search" />
      <input
        name="q"
        placeholder="Rechercher une discussion, un sujet…"
        autoComplete="off"
        aria-label="Rechercher"
      />
    </form>
  );
}

export function Header({ withActions = true }: { withActions?: boolean }) {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Brand />
        <Suspense fallback={<SearchFallback />}>
          <HeaderSearch />
        </Suspense>
        {withActions ? <HeaderActions /> : <div className="hdr-act" />}
      </div>
    </header>
  );
}

/** Loads the member and the spaces once per request, then mounts the interactive app around the page. */
export async function SessionBoundary({ children }: { children: ReactNode }) {
  const [me, spaces] = await Promise.all([
    getCurrentUser(),
    listSpaces().catch((error: unknown): Space[] => {
      if (error instanceof StrapiError) return [];
      throw error;
    }),
  ]);
  return (
    <QueryProvider>
      <AppProvider initialMe={me} spaces={spaces}>
        <SiteBar subscriber={Boolean(me?.subscriber)} />
        <Header />
        <div className="wrap">{children}</div>
        <BottomNav />
        <ModalHost />
        <HoverCards />
      </AppProvider>
    </QueryProvider>
  );
}

/** Static shell shown while the session loads (same frame, no layout shift). */
export function ShellFallback() {
  return (
    <>
      <SiteBar />
      <Header withActions={false} />
      <div className="wrap">
        <div className="layout no-right">
          <nav className="side" aria-hidden="true" />
          <main className="main">
            <FeedSkeleton />
          </main>
        </div>
      </div>
    </>
  );
}

/** Left navigation: main links, then every space (a dot marks the member's interests). */
export function SideNav({
  active,
  spaces,
  interests,
}: {
  active: string;
  spaces: Space[];
  interests: string[];
}) {
  const link = (
    key: string,
    href: string,
    icon: Parameters<typeof Icon>[0]["name"],
    label: string,
  ) => (
    <Link
      className={`nav-link${active === key ? " on" : ""}`}
      href={href}
      aria-current={active === key ? "page" : undefined}
    >
      <Icon name={icon} />
      {label}
    </Link>
  );
  return (
    <nav className="side" aria-label="Navigation principale">
      {link("home", "/", "home", "Accueil")}
      {link("spaces", "/espaces", "grid", "Tous les espaces")}
      {link("leaderboard", "/classement", "trophy", "Classement")}
      {link("charter", "/charte", "book", "Charte")}
      <div className="nav-title">Espaces</div>
      {spaces.length ? (
        spaces.map((s) => (
          <Link
            key={s.documentId}
            className={`nav-link${active === `cat:${s.slug}` ? " on" : ""}`}
            href={spaceHref(s.slug)}
            aria-current={active === `cat:${s.slug}` ? "page" : undefined}
          >
            <SpaceIcon category={s} />
            {s.name}
            {interests.includes(s.slug) && (
              <span className="fav" title="Dans vos centres d'intérêt" />
            )}
          </Link>
        ))
      ) : (
        <p className="hint" style={{ padding: "0 10px" }}>
          Espaces indisponibles pour le moment.
        </p>
      )}
      <a
        className="nav-foot"
        href={SITE}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Retour sur lerevenu.com</span>
        <Icon name="external" className="ext" />
      </a>
    </nav>
  );
}

/** Three-column page: spaces navigation, main column, optional right rail. */
export async function Layout({
  active,
  right,
  children,
}: {
  active: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [me, spaces] = await Promise.all([
    getCurrentUser(),
    listSpaces().catch(() => [] as Space[]),
  ]);
  return (
    <div className={`layout${right ? "" : " no-right"}`}>
      <SideNav
        active={active}
        spaces={spaces}
        interests={me?.interests ?? []}
      />
      <main className="main" id="contenu">
        {children}
      </main>
      {right && <aside className="right">{right}</aside>}
    </div>
  );
}

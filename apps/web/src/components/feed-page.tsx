import Link from "next/link";
import { type FeedFilters, feedHref } from "@/lib/discussion-query";
import { listDiscussions } from "@/lib/strapi/discussions";
import { StrapiError } from "@/lib/strapi/errors";
import type { FeaturedPoll, FeedTab } from "@/lib/strapi/types";
import { Icon } from "./icon";
import { FeedSection, PollWidget } from "./widgets";

/** Widgets degrade one by one: a failed secondary read hides its card instead of breaking the page. */
export async function soft<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof StrapiError) return null;
    throw error;
  }
}

export function ErrorCard({
  message,
  retryHref,
}: {
  message: string;
  retryHref: string;
}) {
  return (
    <div className="card empty" role="alert">
      <h3>Impossible de charger les discussions</h3>
      <p>{message}</p>
      <Link className="btn btn-secondary" href={retryHref}>
        <Icon name="refresh" />
        Réessayer
      </Link>
    </div>
  );
}

/** Feed with prototype tabs (server-filtered, paginated) and the optional inline weekly poll. */
export async function Feed({
  filters,
  logged,
  inlinePoll,
}: {
  filters: FeedFilters;
  logged: boolean;
  inlinePoll?: FeaturedPoll | null;
}) {
  let feed: Awaited<ReturnType<typeof listDiscussions>>;
  try {
    feed = await listDiscussions(filters);
  } catch (error) {
    if (!(error instanceof StrapiError)) throw error;
    if (error.status === 404)
      return (
        <div className="card empty">
          <h3>Espace introuvable</h3>
          <p>Cet espace n&apos;existe pas ou a été renommé.</p>
          <Link className="btn btn-secondary" href="/espaces">
            Voir tous les espaces
          </Link>
        </div>
      );
    return (
      <ErrorCard
        message={error.message}
        retryHref={feedHref(filters, logged)}
      />
    );
  }
  const tabs: FeedTab[] =
    logged && !filters.category
      ? ["foryou", "hot", "new", "unanswered"]
      : ["hot", "new", "unanswered"];
  const unansweredTab = feed.meta.tab === "unanswered";
  return (
    <FeedSection
      tabs={tabs.map((tab) => ({
        tab,
        href: feedHref({ category: filters.category, tab }, logged),
      }))}
      active={feed.meta.tab}
      unanswered={feed.meta.unanswered}
      discussions={feed.data}
      paging={{
        filters: { ...filters, tab: feed.meta.tab },
        pagination: feed.meta.pagination,
        logged,
      }}
      inlinePoll={
        !filters.category && inlinePoll && filters.page === 1 ? (
          <PollWidget poll={inlinePoll} inline />
        ) : undefined
      }
      emptyText={
        unansweredTab
          ? {
              title: "Toutes les questions ont une réponse",
              text: "Bravo à la communauté ! Revenez plus tard ou posez à votre tour une question.",
            }
          : {
              title: "Rien ici pour l'instant",
              text: "Lancez la première discussion de cet espace.",
            }
      }
    />
  );
}

export function CatScroller({
  spaces,
  active,
}: {
  spaces: Array<{ slug: string; name: string }>;
  active: string | null;
}) {
  return (
    <nav className="cat-scroller" aria-label="Espaces">
      <Link
        className={`chip${!active ? " on" : ""}`}
        href="/"
        aria-current={!active ? "page" : undefined}
      >
        Tout
      </Link>
      {spaces.map((s) => (
        <Link
          key={s.slug}
          className={`chip${active === s.slug ? " on" : ""}`}
          href={`/espaces/${encodeURIComponent(s.slug)}`}
          aria-current={active === s.slug ? "page" : undefined}
        >
          {s.name}
        </Link>
      ))}
    </nav>
  );
}

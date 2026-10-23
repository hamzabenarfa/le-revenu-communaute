"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadFeedPage, rsvpEvent, votePoll } from "@/app/actions/community";
import {
  discussionHref,
  type FeedFilters,
  feedHref,
} from "@/lib/discussion-query";
import { cleanTitle, fmt } from "@/lib/format";
import type {
  CommunityEvent,
  DiscussionSummary,
  FeedTab,
  Pagination,
  PollOption,
} from "@/lib/strapi/types";
import { useApp } from "./app/app-context";
import { useActionMutation } from "./app/use-action-mutation";
import { Avatar } from "./atoms";
import { TopicCard, TopicRow } from "./feed";
import { Icon, type IconName } from "./icon";
import { FeedSkeleton } from "./skeletons";

/* --------------------------------------------------------------- Density */

type Density = "comfy" | "compact";
const DENSITY_KEY = "lr-density";

/** Display preference specific to the device; storage may be unavailable (private browsing). */
function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensity] = useState<Density>("comfy");
  useEffect(() => {
    try {
      if (localStorage.getItem(DENSITY_KEY) === "compact")
        setDensity("compact");
    } catch {
      /* default density */
    }
  }, []);
  return [
    density,
    (d) => {
      setDensity(d);
      try {
        localStorage.setItem(DENSITY_KEY, d);
      } catch {
        /* not remembered, still applied */
      }
    },
  ];
}

const TAB_META: Record<FeedTab, [IconName, string]> = {
  foryou: ["spark", "Pour vous"],
  hot: ["trend", "Tendances"],
  new: ["clock", "Récentes"],
  unanswered: ["help", "Sans réponse"],
};

export interface FeedTabLink {
  tab: FeedTab;
  href: string;
}

/* --------------------------------------------------------- Infinite feed */

export interface FeedPaging {
  filters: FeedFilters;
  pagination: Pagination;
  logged: boolean;
}

interface FeedPage {
  items: DiscussionSummary[];
  pagination: Pagination;
}

/**
 * Pages after the server-rendered one, loaded while scrolling. The key holds the
 * first page's ids: when the server sends a different first page (refresh after
 * login, new discussion), loading starts over from it.
 */
function useFeedPages(first: DiscussionSummary[], paging: FeedPaging) {
  const { filters, pagination } = paging;
  const query = useInfiniteQuery({
    queryKey: [
      "feed",
      filters.category,
      filters.tab,
      pagination.page,
      first.map((d) => d.documentId).join(),
    ],
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const result = await loadFeedPage({ ...filters, page: pageParam });
      if (!result.ok) throw new Error(result.error);
      return {
        items: result.data.data,
        pagination: result.data.meta.pagination,
      };
    },
    initialPageParam: pagination.page,
    initialData: {
      pages: [{ items: first, pagination }],
      pageParams: [pagination.page],
    },
    getNextPageParam: ({ pagination: p }) =>
      p.page < p.pageCount ? p.page + 1 : undefined,
    // Loaded pages are kept as is: refetching them all would reshuffle the list.
    staleTime: Number.POSITIVE_INFINITY,
  });
  // Page 1 always comes from the server props (fresh counts); new activity can
  // shift offsets between pages, so a discussion is only listed once.
  const seen = new Set<string>();
  const discussions = [first, ...query.data.pages.slice(1).map((p) => p.items)]
    .flat()
    .filter((d) => !seen.has(d.documentId) && Boolean(seen.add(d.documentId)));
  return { query, discussions };
}

/**
 * Loads the next 12 when the member scrolls to the end of the list; the loading
 * cards show while it arrives, without reloading the page.
 */
function LoadMore({
  query,
}: {
  query: ReturnType<typeof useFeedPages>["query"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    error,
    data,
  } = query;
  const canLoad = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;
  const loaded = data.pages.reduce((n, p) => n + p.items.length, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canLoad) return;
    // Triggers just before the end of the list, so the loading cards are visible.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "0px 0px 150px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canLoad, fetchNextPage]);

  const last = data.pages[data.pages.length - 1]?.pagination;
  return (
    <div className="feed-more" ref={ref}>
      {isFetchingNextPage && <FeedSkeleton count={2} />}
      {isFetchNextPageError && (
        <div className="card empty" role="alert">
          <p>{error?.message ?? "Impossible de charger la suite."}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void fetchNextPage()}
          >
            <Icon name="refresh" />
            Réessayer
          </button>
        </div>
      )}
      {last && (
        <p className="hint num" aria-live="polite">
          {Math.min(loaded, last.total)} discussions affichées sur {last.total}
        </p>
      )}
      {!hasNextPage && data.pages.length > 1 && (
        <p className="hint">Vous avez parcouru toutes les discussions.</p>
      )}
    </div>
  );
}

/** Tabs + density toggle + list; inserts the weekly poll after the third card on mobile (home only). */
export function FeedSection({
  tabs,
  active,
  unanswered,
  discussions: firstPage,
  paging,
  inlinePoll,
  emptyText,
}: {
  tabs: FeedTabLink[];
  active: FeedTab;
  unanswered: number;
  discussions: DiscussionSummary[];
  paging: FeedPaging;
  inlinePoll?: React.ReactNode;
  emptyText: { title: string; text: string };
}) {
  const [density, setDensity] = useDensity();
  const { openComposer } = useApp();
  const { query, discussions } = useFeedPages(firstPage, paging);
  const view = (d: Density, icon: IconName, label: string) => (
    <button
      type="button"
      className={density === d ? "on" : undefined}
      aria-pressed={density === d}
      aria-label={label}
      title={label}
      onClick={() => setDensity(d)}
    >
      <Icon name={icon} />
    </button>
  );

  let list: React.ReactNode;
  if (!discussions.length) {
    list = (
      <div className="feed">
        <div className="empty">
          <h3>{emptyText.title}</h3>
          <p>{emptyText.text}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openComposer()}
          >
            <Icon name="plus" />
            Publier
          </button>
        </div>
      </div>
    );
  } else if (density === "compact") {
    list = (
      <div className="feed feed-compact">
        <div className="trow trow-head">
          <span>Discussion</span>
          <span className="c-num">Réponses</span>
          <span className="c-num c-views">Vues</span>
          <span className="c-num">Activité</span>
        </div>
        {discussions.map((d) => (
          <TopicRow key={d.documentId} d={d} />
        ))}
      </div>
    );
  } else {
    const cards: React.ReactNode[] = discussions.map((d) => (
      <TopicCard key={d.documentId} d={d} />
    ));
    if (inlinePoll && cards.length > 3)
      cards.splice(3, 0, <div key="inline-poll">{inlinePoll}</div>);
    list = <div className="feed">{cards}</div>;
  }

  return (
    <>
      <div className="feed-bar">
        <nav className="tabs" aria-label="Classement des discussions">
          {tabs.map(({ tab, href }) => {
            const [icon, label] = TAB_META[tab];
            return (
              <Link
                key={tab}
                href={href}
                className={`tab${tab === active ? " on" : ""}`}
                aria-current={tab === active ? "page" : undefined}
              >
                <Icon name={icon} />
                {label}
                {tab === "unanswered" && unanswered > 0 && (
                  <span className="cnt">{unanswered}</span>
                )}
              </Link>
            );
          })}
        </nav>
        {/* biome-ignore lint/a11y/useSemanticElements: a two-button toolbar, as in the prototype; a fieldset would add form semantics */}
        <span
          className="seg-ic"
          role="group"
          aria-label="Affichage de la liste"
        >
          {view("comfy", "rows", "Vue détaillée")}
          {view("compact", "list", "Vue compacte")}
        </span>
      </div>
      {paging.pagination.page > 1 && (
        <Link
          className="btn btn-quiet btn-sm"
          href={feedHref({ ...paging.filters, page: 1 }, paging.logged)}
        >
          <Icon name="arrowL" />
          Revenir aux premières discussions
        </Link>
      )}
      {list}
      {discussions.length > 0 && <LoadMore query={query} />}
    </>
  );
}

/* --------------------------------------------------------- Quick composer */

export function QuickComposer() {
  const { me, openComposer } = useApp();
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of publish shortcuts, not a form
    <div className="quick" role="group" aria-label="Publier">
      {me ? (
        <Avatar person={me} size="md" link={false} />
      ) : (
        <span
          className="av av-md"
          style={{ ["--c" as string]: "var(--ink-3)" }}
          aria-hidden="true"
        >
          <Icon name="user" />
        </span>
      )}
      <button
        type="button"
        className="quick-input"
        onClick={() => openComposer({ type: "question" })}
      >
        Posez votre question à la communauté…
      </button>
      <div className="quick-types">
        <button
          type="button"
          className="quick-type"
          onClick={() => openComposer({ type: "question" })}
        >
          <Icon name="help" />
          Question
        </button>
        <button
          type="button"
          className="quick-type"
          onClick={() => openComposer({ type: "discussion" })}
        >
          <Icon name="msg" />
          Discussion
        </button>
        <button
          type="button"
          className="quick-type"
          onClick={() => openComposer({ type: "poll" })}
        >
          <Icon name="chart" />
          Sondage
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Poll */

/** Vote in one click; results appear only after voting; another click changes the vote. */
export function Poll({
  discussionId,
  options,
  myVote,
}: {
  discussionId: string;
  options: PollOption[];
  myVote: number | null;
}) {
  const { requireLogin } = useApp();
  const [state, setState] = useState({ options, myVote });
  useEffect(() => setState({ options, myVote }), [options, myVote]);
  const total = state.options.reduce((s, o) => s + o.votes, 0);
  const voted = state.myVote !== null;

  // Results show at once with the vote moved; the server's counts replace them.
  const send = useActionMutation((i: number) => votePoll(discussionId, i), {
    onMutate: (i) => {
      const before = state;
      setState({
        myVote: i,
        options: before.options.map((o, k) => ({
          ...o,
          votes: o.votes - (k === before.myVote ? 1 : 0) + (k === i ? 1 : 0),
        })),
      });
      return before;
    },
    onError: (_error, _i, before) => before && setState(before),
    onSuccess: (data) =>
      setState({ options: data.pollOptions, myVote: data.myVote }),
  });
  const vote = (i: number) =>
    requireLogin(() => {
      if (state.myVote !== i && !send.isPending) send.mutate(i);
    });

  return (
    <div className="poll">
      {state.options.map((o, i) => {
        const pct = total ? Math.round((o.votes * 100) / total) : 0;
        const mine = state.myVote === i;
        return voted ? (
          <button
            key={o.label}
            type="button"
            className={`popt res${mine ? " mine" : ""}`}
            onClick={() => vote(i)}
            aria-pressed={mine}
          >
            <span className="pbar" style={{ ["--w" as string]: `${pct}%` }} />
            <span className="plabel">
              {mine && <Icon name="check" />}
              {o.label}
            </span>
            <span className="ppct">{pct} %</span>
          </button>
        ) : (
          <button
            key={o.label}
            type="button"
            className="popt"
            onClick={() => vote(i)}
          >
            <span className="pradio" />
            <span className="plabel">{o.label}</span>
          </button>
        );
      })}
      <p className="pfoot">
        <span className="num">{fmt(total)}</span> votes ·{" "}
        {voted
          ? "Touchez une autre réponse pour changer d'avis"
          : "Votez pour voir les résultats"}
      </p>
    </div>
  );
}

export function PollWidget({
  poll,
  inline = false,
}: {
  poll: DiscussionSummary & {
    pollOptions: PollOption[];
    myVote: number | null;
  };
  inline?: boolean;
}) {
  return (
    <section className={`card w-poll${inline ? " inline-mod" : ""}`}>
      <div className="w-label">
        <Icon name="chart" />
        Sondage de la semaine
      </div>
      <h3
        style={{
          fontFamily: "var(--f-display)",
          fontSize: 17,
          lineHeight: 1.3,
          marginBottom: 12,
        }}
      >
        <Link href={discussionHref(poll.slug)}>
          {cleanTitle(poll.title, "Sondage de la semaine : ")}
        </Link>
      </h3>
      <Poll
        discussionId={poll.documentId}
        options={poll.pollOptions}
        myVote={poll.myVote}
      />
    </section>
  );
}

/* ---------------------------------------------------------------- Events */

const dayParts = (iso: string) => {
  const dt = new Date(iso);
  const tz = { timeZone: "Europe/Paris" } as const;
  return {
    wd: dt
      .toLocaleDateString("fr-FR", { weekday: "short", ...tz })
      .replace(".", ""),
    day: dt.toLocaleDateString("fr-FR", { day: "numeric", ...tz }),
    mo: dt.toLocaleDateString("fr-FR", { month: "short", ...tz }),
    time: dt.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      ...tz,
    }),
  };
};

export function EventsWidget({ events }: { events: CommunityEvent[] }) {
  const { requireLogin, toast } = useApp();
  const [list, setList] = useState(events);
  useEffect(() => setList(events), [events]);
  const put = (updated: CommunityEvent) =>
    setList((l) =>
      l.map((x) => (x.documentId === updated.documentId ? updated : x)),
    );
  const send = useActionMutation(
    (e: CommunityEvent) => rsvpEvent(e.documentId),
    {
      onMutate: (e) =>
        put({
          ...e,
          attending: !e.attending,
          going: Math.max(0, e.going + (e.attending ? -1 : 1)),
        }),
      onError: (_error, e) => put(e),
      onSuccess: (updated) => {
        put(updated);
        if (updated.attending)
          toast(
            <>
              <Icon name="cal" />
              <div>
                <b>C&apos;est noté !</b>
                <small>
                  Rappel la veille par notification et e-mail. Vous pouvez déjà
                  poser vos questions.
                </small>
              </div>
            </>,
          );
      },
    },
  );
  if (!list.length) return null;

  const rsvp = (e: CommunityEvent) =>
    requireLogin(() => {
      if (!send.isPending) send.mutate(e);
    });

  return (
    <section className="card">
      <h2 className="card-title">
        <Icon name="cal" />
        Le Revenu répond
      </h2>
      {list.map((e) => {
        const x = dayParts(e.startsAt);
        return (
          <div className="ev" key={e.documentId}>
            <div className="ev-date">
              <small>{x.wd}</small>
              <b>{x.day}</b>
            </div>
            <div>
              <h4>{e.title}</h4>
              <p>
                {x.day} {x.mo} à {x.time} · {e.host}
              </p>
              <div className="row">
                <button
                  type="button"
                  className={`btn btn-sm ${e.attending ? "btn-going" : "btn-secondary"}`}
                  onClick={() => rsvp(e)}
                  aria-pressed={e.attending}
                >
                  {e.attending ? (
                    <>
                      <Icon name="check" />
                      Inscrit
                    </>
                  ) : (
                    "Je participe"
                  )}
                </button>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  <span className="num">{e.going}</span> participants
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ----------------------------------------------------------------- Login */

export function LoginButton({
  className = "btn btn-primary",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { requireLogin } = useApp();
  return (
    <button type="button" className={className} onClick={() => requireLogin()}>
      {children}
    </button>
  );
}

export function ComposeButton({
  className = "btn btn-primary",
  category,
  title,
  type,
  children,
}: {
  className?: string;
  category?: string;
  title?: string;
  type?: "question" | "discussion" | "poll";
  children: React.ReactNode;
}) {
  const { openComposer } = useApp();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openComposer({ category, title, type })}
    >
      {children}
    </button>
  );
}

export function BlogButton({
  className = "btn btn-primary",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { openBlogEditor } = useApp();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openBlogEditor()}
    >
      {children}
    </button>
  );
}

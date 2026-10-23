import { connection } from "next/server";
import { Suspense } from "react";
import { CatScroller, Feed, soft } from "@/components/feed-page";
import { Icon } from "@/components/icon";
import {
  BlogWidget,
  JoinCard,
  ProgressCard,
  QuestionWidget,
  SiteWidget,
  TopWidget,
} from "@/components/rail";
import { Layout } from "@/components/shell";
import { FeedSkeleton, RailSkeleton } from "@/components/skeletons";
import {
  EventsWidget,
  LoginButton,
  PollWidget,
  QuickComposer,
} from "@/components/widgets";
import { parseFeedFilters } from "@/lib/discussion-query";
import { fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import {
  getEvents,
  getLeaderboard,
  getPosts,
  getSiteArticles,
  getStats,
} from "@/lib/strapi/community";
import { getFeatured } from "@/lib/strapi/discussions";
import { listSpaces } from "@/lib/strapi/spaces";
import type { Me } from "@/lib/strapi/types";

async function Hero() {
  const stats = await soft(getStats());
  return (
    <section className="hero">
      <div>
        <h1>La communauté des lecteurs du Revenu</h1>
        <p>
          Posez vos questions d&apos;argent, partagez vos expériences et
          échangez avec la rédaction. Bourse, épargne, impôts, retraite,
          transmission.
        </p>
        {stats && (
          <div className="hero-stats">
            <span>
              <b>{fmt(stats.members)}</b>membres
            </span>
            <span>
              <b>{fmt(stats.discussions)}</b>discussions
            </span>
            <span>
              <b>{fmt(stats.replies)}</b>réponses
            </span>
            <span>
              <b>{stats.resolvedRate} %</b>des questions résolues
            </span>
          </div>
        )}
      </div>
      <div className="hero-cta">
        <LoginButton>Rejoindre gratuitement</LoginButton>
        <a className="btn btn-quiet" href="/espaces">
          Explorer les espaces
        </a>
      </div>
    </section>
  );
}

function Greeting({ me }: { me: Me }) {
  return (
    <div className="greet">
      <h1>Bonjour {me.name}</h1>
      {me.streak > 1 && (
        <span className="streak">
          <Icon name="flame" />
          {me.streak} jours d&apos;affilée
        </span>
      )}
    </div>
  );
}

async function Right({ me }: { me: Me | null }) {
  const [featured, posts, articles, events, top] = await Promise.all([
    soft(getFeatured()),
    soft(getPosts(3)),
    soft(getSiteArticles()),
    soft(getEvents()),
    soft(getLeaderboard("month")),
  ]);
  return (
    <>
      {me ? <ProgressCard me={me} /> : <JoinCard />}
      {featured?.question && <QuestionWidget question={featured.question} />}
      {featured?.poll && <PollWidget poll={featured.poll} />}
      <BlogWidget posts={posts ?? []} logged={Boolean(me)} />
      <SiteWidget articles={articles ?? []} />
      <EventsWidget events={events ?? []} />
      <TopWidget rows={top?.data ?? []} />
    </>
  );
}

async function Home({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const me = await getCurrentUser();
  const filters = parseFeedFilters(await searchParams, { logged: Boolean(me) });
  const [spaces, featured] = await Promise.all([
    listSpaces().catch(() => []),
    soft(getFeatured()),
  ]);
  return (
    <Layout
      active="home"
      right={
        <Suspense fallback={<RailSkeleton />}>
          <Right me={me} />
        </Suspense>
      }
    >
      {me ? <Greeting me={me} /> : <Hero />}
      <QuickComposer />
      <CatScroller spaces={spaces} active={null} />
      <Suspense key={JSON.stringify(filters)} fallback={<FeedSkeleton />}>
        <Feed
          filters={filters}
          logged={Boolean(me)}
          inlinePoll={featured?.poll}
        />
      </Suspense>
    </Layout>
  );
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SpaceIcon } from "@/components/atoms";
import { CatScroller, Feed, soft } from "@/components/feed-page";
import { Icon } from "@/components/icon";
import { JoinCard, ProgressCard, TopWidget } from "@/components/rail";
import { Layout } from "@/components/shell";
import { FeedSkeleton, RailSkeleton } from "@/components/skeletons";
import { ComposeButton, EventsWidget } from "@/components/widgets";
import { parseFeedFilters } from "@/lib/discussion-query";
import { fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { getEvents, getLeaderboard } from "@/lib/strapi/community";
import { findSpace, listSpaces } from "@/lib/strapi/spaces";
import type { Me } from "@/lib/strapi/types";

type Props = PageProps<"/espaces/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const space = await findSpace((await params).slug).catch(() => null);
  return {
    title: space?.name ?? "Espace",
    description: space?.description ?? undefined,
  };
}

async function Right({ me, slug }: { me: Me | null; slug: string }) {
  const [events, top] = await Promise.all([
    soft(getEvents(slug)),
    soft(getLeaderboard("month")),
  ]);
  return (
    <>
      {me ? <ProgressCard me={me} /> : <JoinCard />}
      <EventsWidget events={events ?? []} />
      <TopWidget rows={top?.data ?? []} />
    </>
  );
}

async function SpaceView({ params, searchParams }: Props) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const { slug } = await params;
  const [me, space, spaces] = await Promise.all([
    getCurrentUser(),
    findSpace(slug).catch(() => null),
    listSpaces().catch(() => []),
  ]);
  if (!space) notFound();
  const filters = parseFeedFilters(await searchParams, {
    category: slug,
    logged: Boolean(me),
  });

  return (
    <Layout
      active={`cat:${slug}`}
      right={
        <Suspense fallback={<RailSkeleton />}>
          <Right me={me} slug={slug} />
        </Suspense>
      }
    >
      <section className="cat-head">
        <SpaceIcon category={space} size="lg" />
        <div className="grow">
          <h1>{space.name}</h1>
          <p>{space.description}</p>
          <div className="stats">
            <span>
              <b className="num">{space.discussionCount}</b> discussions
            </span>
            <span>
              <b className="num">{fmt(space.replyCount)}</b> réponses
            </span>
            <span>
              <b className="num">{space.activeMembers}</b> membres actifs
            </span>
          </div>
          {space.rubrique && (
            <a
              className="site-link"
              href="https://www.lerevenu.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external" />
              Toute la rubrique « {space.rubrique} » sur lerevenu.com
            </a>
          )}
        </div>
        <ComposeButton category={space.slug}>
          <Icon name="plus" />
          Publier ici
        </ComposeButton>
      </section>
      <CatScroller spaces={spaces} active={slug} />
      <Suspense key={JSON.stringify(filters)} fallback={<FeedSkeleton />}>
        <Feed filters={filters} logged={Boolean(me)} />
      </Suspense>
    </Layout>
  );
}

export default function SpacePage(props: Props) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <SpaceView {...props} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar, BADGES, BadgeIcon, profileHref } from "@/components/atoms";
import { ErrorCard } from "@/components/feed-page";
import { Icon } from "@/components/icon";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { getLeaderboard } from "@/lib/strapi/community";
import { StrapiError } from "@/lib/strapi/errors";

export const metadata: Metadata = {
  title: "Classement des contributeurs",
  alternates: { canonical: "/classement" },
};

async function Board({
  searchParams,
}: {
  searchParams: PageProps<"/classement">["searchParams"];
}) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const period = (await searchParams).periode === "toujours" ? "all" : "month";
  let board: Awaited<ReturnType<typeof getLeaderboard>>;
  try {
    board = await getLeaderboard(period);
  } catch (error) {
    if (!(error instanceof StrapiError)) throw error;
    return (
      <Layout active="leaderboard">
        <ErrorCard message={error.message} retryHref="/classement" />
      </Layout>
    );
  }
  const right = (
    <>
      <section className="card">
        <h2 className="card-title">Gagner des points</h2>
        <ul className="plist">
          {board.meta.rules.map(([label, pts]) => (
            <li key={label}>
              <span>{label}</span>
              <b>+{pts}</b>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="card-title">Les niveaux</h2>
        <ul className="plist">
          {board.meta.levels.map(([pts, name]) => (
            <li key={name}>
              <span>{name}</span>
              <b>{pts}</b>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="card-title">Badges à débloquer</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(BADGES)
            .slice(0, 6)
            .map(([code, b]) => (
              <div
                key={code}
                style={{ display: "flex", gap: 10, alignItems: "center" }}
              >
                <BadgeIcon code={code} />
                <div style={{ fontSize: 13.5 }}>
                  <b>{b.name}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {b.description}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>
    </>
  );
  return (
    <Layout active="leaderboard" right={right}>
      <header className="page-head">
        <h1>Classement des contributeurs</h1>
        <p>
          Les membres qui font vivre la communauté. Aidez les autres, gagnez des
          points, montez de niveau.
        </p>
      </header>
      <nav className="tabs" aria-label="Période">
        <Link
          className={`tab${period === "month" ? " on" : ""}`}
          href="/classement"
          aria-current={period === "month" ? "page" : undefined}
        >
          <Icon name="cal" />
          Ce mois-ci
        </Link>
        <Link
          className={`tab${period === "all" ? " on" : ""}`}
          href="/classement?periode=toujours"
          aria-current={period === "all" ? "page" : undefined}
        >
          <Icon name="trophy" />
          Depuis toujours
        </Link>
      </nav>
      <ol className="lb card" style={{ padding: 0 }}>
        {board.data.map((row, i) => (
          <li key={row.person.username} className={row.me ? "me" : undefined}>
            <span className="rank">
              {i < 3 ? (
                <span className={`medal m${i + 1}`}>{i + 1}</span>
              ) : (
                i + 1
              )}
            </span>
            <Avatar person={row.person} size="sm" />
            <Link
              className="who"
              href={profileHref(row.person.username)}
              data-u={row.person.username}
            >
              <b>{row.person.name}</b>
              <small>{row.level}</small>
            </Link>
            <span className="pts num">
              {period === "all" ? row.points : `+${row.monthPoints}`} pts
            </span>
          </li>
        ))}
      </ol>
    </Layout>
  );
}

export default function LeaderboardPage({
  searchParams,
}: PageProps<"/classement">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Board searchParams={searchParams} />
    </Suspense>
  );
}

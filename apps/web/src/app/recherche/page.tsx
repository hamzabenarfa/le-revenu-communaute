import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TopicCard } from "@/components/feed";
import { ErrorCard } from "@/components/feed-page";
import { Icon } from "@/components/icon";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { ComposeButton } from "@/components/widgets";
import { searchDiscussions } from "@/lib/strapi/discussions";
import { StrapiError } from "@/lib/strapi/errors";

export const metadata: Metadata = { title: "Rechercher" };
const SUGGESTIONS = [
  "PEA",
  "assurance-vie",
  "donation",
  "SCPI",
  "PER",
  "frais réels",
];

async function Results({ q }: { q: string }) {
  let list: Awaited<ReturnType<typeof searchDiscussions>>;
  try {
    list = await searchDiscussions(q);
  } catch (error) {
    if (!(error instanceof StrapiError)) throw error;
    return (
      <ErrorCard
        message={error.message}
        retryHref={`/recherche?q=${encodeURIComponent(q)}`}
      />
    );
  }
  return (
    <>
      <p className="muted">
        <span className="num">{list.length}</span> résultat
        {list.length > 1 ? "s" : ""} pour « {q} »
      </p>
      {list.length ? (
        <div className="feed">
          {list.map((d) => (
            <TopicCard key={d.documentId} d={d} />
          ))}
        </div>
      ) : (
        <div className="card empty">
          <h3>Aucune discussion trouvée</h3>
          <p>
            Posez la question à la communauté : quelqu&apos;un a sûrement vécu
            la même situation.
          </p>
          <ComposeButton title={q}>
            <Icon name="plus" />
            Poser cette question
          </ComposeButton>
        </div>
      )}
    </>
  );
}

async function Search({
  searchParams,
}: {
  searchParams: PageProps<"/recherche">["searchParams"];
}) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  return (
    <Layout active="">
      <header className="page-head">
        <h1>Rechercher</h1>
      </header>
      <form
        className="search"
        action="/recherche"
        style={{
          display: "flex",
          maxWidth: "none",
          background: "var(--surface)",
          borderColor: "var(--line)",
        }}
      >
        <Icon name="search" />
        <input
          name="q"
          placeholder="PEA, donation, SCPI…"
          defaultValue={q}
          autoComplete="off"
          aria-label="Rechercher"
        />
      </form>
      {q ? (
        <Suspense key={q} fallback={<FeedSkeleton />}>
          <Results q={q} />
        </Suspense>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              className="chip"
              href={`/recherche?q=${encodeURIComponent(s)}`}
            >
              {s}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/recherche">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Search searchParams={searchParams} />
    </Suspense>
  );
}

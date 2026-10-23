import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SpaceIcon, spaceHref } from "@/components/atoms";
import { ErrorCard } from "@/components/feed-page";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { fmt } from "@/lib/format";
import { StrapiError } from "@/lib/strapi/errors";
import { listSpaces } from "@/lib/strapi/spaces";

export const metadata: Metadata = { title: "Tous les espaces" };

async function Spaces() {
  let spaces: Awaited<ReturnType<typeof listSpaces>>;
  try {
    spaces = await listSpaces();
  } catch (error) {
    if (!(error instanceof StrapiError)) throw error;
    return <ErrorCard message={error.message} retryHref="/espaces" />;
  }
  return (
    <div className="spaces-grid">
      {spaces.map((s) => (
        <article className="space stretch" key={s.documentId}>
          <SpaceIcon category={s} size="md" />
          <h3>
            <Link className="stretch-link" href={spaceHref(s.slug)}>
              {s.name}
            </Link>
          </h3>
          <p>{s.description}</p>
          <small>
            <span className="num">{s.discussionCount}</span> discussions ·{" "}
            <span className="num">{fmt(s.replyCount)}</span> réponses
          </small>
        </article>
      ))}
    </div>
  );
}

async function Page() {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  return (
    <Layout active="spaces">
      <header className="page-head">
        <h1>Tous les espaces</h1>
        <p>
          Des espaces thématiques, calqués sur les grandes rubriques du Revenu.
        </p>
      </header>
      <Spaces />
    </Layout>
  );
}

export default function SpacesPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Page />
    </Suspense>
  );
}

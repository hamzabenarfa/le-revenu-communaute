import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorCard } from "@/components/feed-page";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { getCharter } from "@/lib/strapi/community";
import { StrapiError } from "@/lib/strapi/errors";

export const metadata: Metadata = { title: "La charte de la communauté" };

async function Charter() {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  let charter: Awaited<ReturnType<typeof getCharter>>;
  try {
    charter = await getCharter();
  } catch (error) {
    if (!(error instanceof StrapiError)) throw error;
    return (
      <Layout active="charter">
        <ErrorCard message={error.message} retryHref="/charte" />
      </Layout>
    );
  }
  return (
    <Layout active="charter">
      <header className="page-head">
        <h1>{charter.title}</h1>
        {charter.intro && <p>{charter.intro}</p>}
      </header>
      <ol className="rules">
        {charter.rules.map(([title, text]) => (
          <li key={title}>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Layout>
  );
}

export default function CharterPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Charter />
    </Suspense>
  );
}

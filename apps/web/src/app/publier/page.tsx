import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenComposerOnMount } from "@/components/profile-buttons";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { NO_INDEX } from "@/lib/site";

export const metadata: Metadata = {
  title: "Nouvelle publication",
  robots: NO_INDEX,
};

async function Publish({
  searchParams,
}: {
  searchParams: PageProps<"/publier">["searchParams"];
}) {
  const category = (await searchParams).categorie;
  return (
    <Layout active="">
      <header className="page-head">
        <h1>Nouvelle publication</h1>
        <p>
          Une question, une expérience à partager ou un sondage : la communauté
          vous répond.
        </p>
      </header>
      <div>
        <OpenComposerOnMount
          category={typeof category === "string" ? category : undefined}
        />
      </div>
    </Layout>
  );
}

export default function PublishPage({ searchParams }: PageProps<"/publier">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Publish searchParams={searchParams} />
    </Suspense>
  );
}

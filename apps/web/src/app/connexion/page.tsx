import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginPageForm } from "@/components/login-page-form";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { safeRedirectPath } from "@/lib/form-state";
import { getCurrentUser } from "@/lib/session";
import { NO_INDEX } from "@/lib/site";

export const metadata: Metadata = { title: "Connexion", robots: NO_INDEX };

async function Login({
  searchParams,
}: {
  searchParams: PageProps<"/connexion">["searchParams"];
}) {
  const raw = (await searchParams).next;
  const next = safeRedirectPath(typeof raw === "string" ? raw : undefined);
  if (await getCurrentUser()) redirect(next);
  return (
    <Layout active="">
      <header className="page-head">
        <h1>Connexion</h1>
        <p>
          Connectez-vous avec votre compte lerevenu.com pour publier et
          répondre.
        </p>
      </header>
      <div style={{ maxWidth: 440 }}>
        <LoginPageForm next={next} />
      </div>
    </Layout>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

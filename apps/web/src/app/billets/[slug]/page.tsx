import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { publishComment } from "@/app/actions/community";
import { Avatar, CatTag, profileHref, RoleTags } from "@/components/atoms";
import {
  ReplyBox,
  ReplyToButton,
  ReportButton,
  ShareButton,
  UsefulButton,
} from "@/components/discussion-actions";
import { Cover } from "@/components/feed";
import { soft } from "@/components/feed-page";
import { Icon } from "@/components/icon";
import { Prose } from "@/components/prose";
import { SiteWidget } from "@/components/rail";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { LoginButton } from "@/components/widgets";
import { postHref } from "@/lib/discussion-query";
import { ago, cap, fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { openGraph } from "@/lib/site";
import { getPost, getSiteArticles } from "@/lib/strapi/community";

type Props = PageProps<"/billets/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await soft(getPost((await params).slug));
  if (!p) return { title: "Billet" };
  return {
    title: p.title,
    description: p.excerpt,
    alternates: { canonical: postHref(p.slug) },
    openGraph: openGraph({
      type: "article",
      title: p.title,
      description: p.excerpt,
      url: postHref(p.slug),
      publishedTime: p.publishedAt ?? undefined,
      section: p.category?.name,
      authors: p.author ? [p.author.name] : undefined,
    }),
  };
}

async function PostView({ params }: Props) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const [post, me, articles] = await Promise.all([
    getPost((await params).slug),
    getCurrentUser(),
    soft(getSiteArticles()),
  ]);
  if (!post) notFound();
  const u = post.author;
  const n = post.comments.length;
  const context = [
    u?.username,
    ...post.comments.map((c) => c.author?.username),
  ].filter((x): x is string => Boolean(x));

  const right = (
    <>
      {u && (
        <section className="card author-card">
          <div className="ac-head">
            <Avatar person={u} size="lg" />
            <div>
              <b>{u.name}</b>
              <small>
                {u.role === "member" ? (
                  <>
                    {u.level} · <span className="num">{u.points}</span> points
                  </>
                ) : (
                  "Compte officiel"
                )}
              </small>
            </div>
          </div>
          {u.bio && <p>{u.bio}</p>}
          <Link
            className="btn btn-secondary btn-sm btn-block"
            href={profileHref(u.username)}
          >
            Voir le profil
          </Link>
        </section>
      )}
      {post.moreFromAuthor.length > 0 && (
        <section className="card">
          <h2 className="card-title">
            <Icon name="pen" />
            Du même auteur
          </h2>
          <div className="rlist">
            {post.moreFromAuthor.map((x) => (
              <Link
                key={x.documentId}
                className="ritem bw"
                href={postHref(x.slug)}
              >
                <Cover post={x} className="bthumb" />
                <div>
                  <b>{x.title}</b>
                  <p>{x.readTime} min de lecture</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <SiteWidget articles={articles ?? []} />
    </>
  );

  return (
    <Layout active="" right={right}>
      {u && (
        <nav className="crumbs" aria-label="Fil d'Ariane">
          <Link href={profileHref(u.username)}>{u.name}</Link>
          <Icon name="chev" />
          <span>Billets</span>
        </nav>
      )}
      <article className="post post-main blog-post">
        <Cover post={post} className="blog-cover" />
        <div className="tmeta">
          <span className="tag tag-blog">
            <Icon name="pen" />
            Billet de blog
          </span>
          <CatTag category={post.category} />
        </div>
        <h1>{post.title}</h1>
        {u && (
          <div className="author">
            <Avatar person={u} size="md" />
            <div>
              <Link
                className="author-name"
                href={profileHref(u.username)}
                data-u={u.username}
              >
                {u.name} <RoleTags person={u} />
              </Link>
              <div className="author-sub">
                {cap(ago(post.publishedAt))} · {post.readTime} min de lecture ·{" "}
                <span className="num">{fmt(post.views)}</span> lectures
              </div>
            </div>
          </div>
        )}
        <Prose text={post.content} />
        <div className="actions">
          <UsefulButton
            targetType="post"
            targetId={post.documentId}
            liked={post.liked}
            count={post.usefulCount}
            mine={Boolean(me && u && me.username === u.username)}
          />
          <ShareButton />
          <ReportButton targetType="post" targetId={post.documentId} />
        </div>
      </article>
      <section className="replies" aria-label="Commentaires">
        <h2 className="section-title">
          {n
            ? `${n} commentaire${n > 1 ? "s" : ""}`
            : "Aucun commentaire pour l'instant"}
        </h2>
        {post.comments.map((c) => (
          <article
            key={c.documentId}
            className={`post reply${c.author?.role === "redaction" ? " is-redac" : ""}`}
            id={`r-${c.documentId}`}
          >
            {c.author && (
              <div className="author">
                <Avatar person={c.author} size="sm" />
                <div>
                  <Link
                    className="author-name"
                    href={profileHref(c.author.username)}
                    data-u={c.author.username}
                  >
                    {c.author.name} <RoleTags person={c.author} />
                  </Link>
                  <div className="author-sub">{ago(c.publishedAt)}</div>
                </div>
              </div>
            )}
            <Prose text={c.content} />
            <div className="actions">
              <UsefulButton
                targetType="comment"
                targetId={c.documentId}
                liked={c.liked}
                count={c.usefulCount}
                mine={c.mine}
              />
              {!c.mine && c.author && (
                <ReplyToButton username={c.author.username} />
              )}
              <ReportButton
                targetType="comment"
                targetId={c.documentId}
                iconOnly
              />
            </div>
          </article>
        ))}
        {me ? (
          <ReplyBox
            targetId={post.documentId}
            label="Votre commentaire"
            verb="Commenter"
            context={context}
            publish={publishComment}
            placeholder={`Réagissez au billet de ${u?.name ?? "ce membre"}…`}
          />
        ) : (
          <div className="post reply-login" id="repondre">
            <h3>Ce billet vous a parlé ?</h3>
            <p className="muted">
              Rejoignez la communauté avec votre compte lerevenu.com pour le
              commenter.
            </p>
            <LoginButton>Se connecter pour commenter</LoginButton>
          </div>
        )}
      </section>
    </Layout>
  );
}

export default function PostPage(props: Props) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <PostView {...props} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  Avatar,
  AvatarStack,
  CatTag,
  PinTag,
  profileHref,
  RoleTags,
  SeoPill,
  SpaceIcon,
  spaceHref,
  TypeTag,
} from "@/components/atoms";
import {
  FocusReplyButton,
  FollowButton,
  JumpButton,
  ReplyBox,
  ReplyToButton,
  ReportButton,
  ShareButton,
  SolveButton,
  UsefulButton,
  VerifyButton,
} from "@/components/discussion-actions";
import { TopicCard } from "@/components/feed";
import { soft } from "@/components/feed-page";
import { Icon } from "@/components/icon";
import { Prose } from "@/components/prose";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import {
  ComposeButton,
  EventsWidget,
  LoginButton,
  Poll,
} from "@/components/widgets";
import { ago, fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { getEvents } from "@/lib/strapi/community";
import { getDiscussion } from "@/lib/strapi/discussions";
import { findSpace } from "@/lib/strapi/spaces";
import type { DiscussionDetail, Reply } from "@/lib/strapi/types";

type Props = PageProps<"/discussions/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await soft(getDiscussion((await params).slug));
  return {
    title: d?.title ?? "Discussion",
    description: d?.excerpt,
    robots: d?.seo && !d.seo.indexed ? { index: false } : undefined,
  };
}

function ReplyCard({ d, r }: { d: DiscussionDetail; r: Reply }) {
  const redac = r.author?.role === "redaction";
  const canSolve = Boolean(d.viewer?.canSolve && !r.mine);
  return (
    <article
      className={`post reply${r.isSolution ? " is-solution" : ""}${redac ? " is-redac" : ""}`}
      id={`r-${r.documentId}`}
    >
      {r.isSolution && (
        <div className="post-flag ok">
          <Icon name="check" />
          Meilleure réponse
        </div>
      )}{" "}
      {r.verified && (
        <div className="post-flag verified">
          <Icon name="verified" />
          Vérifiée par la rédaction
        </div>
      )}{" "}
      {redac && (
        <div className="post-flag redac">
          <Icon name="check" />
          Réponse de la rédaction
        </div>
      )}
      {r.author && (
        <div className="author">
          <Avatar person={r.author} size="sm" />
          <div>
            <Link
              className="author-name"
              href={profileHref(r.author.username)}
              data-u={r.author.username}
            >
              {r.author.name} <RoleTags person={r.author} />
            </Link>
            <div className="author-sub">{ago(r.publishedAt)}</div>
          </div>
        </div>
      )}
      <Prose text={r.content} />
      <div className="actions">
        <UsefulButton
          targetType="reply"
          targetId={r.documentId}
          liked={r.liked}
          count={r.usefulCount}
          mine={r.mine}
          firstHint={r.author?.name}
        />
        {!r.mine && r.author && <ReplyToButton username={r.author.username} />}
        {d.viewer?.staff && r.isSolution && (
          <VerifyButton replyId={r.documentId} verified={r.verified} />
        )}
        {canSolve && (
          <SolveButton
            discussionId={d.documentId}
            replyId={r.documentId}
            isSolution={r.isSolution}
          />
        )}
        <ReportButton targetType="reply" targetId={r.documentId} iconOnly />
      </div>
    </article>
  );
}

async function Right({ d }: { d: DiscussionDetail }) {
  const [events, space] = await Promise.all([
    soft(getEvents(d.category?.slug)),
    d.category ? findSpace(d.category.slug).catch(() => null) : null,
  ]);
  const n = d.replyCount;
  const isAuthor = d.viewer?.isAuthor;
  return (
    <>
      {!n && !isAuthor && d.type !== "poll" && (
        <section className="card help-card">
          <h3>Soyez le premier à aider {d.author?.name}</h3>
          <p>
            Une question sans réponse depuis{" "}
            {ago(d.publishedAt).replace("il y a ", "")}. Votre expérience
            compte, même partielle.
          </p>
          <FocusReplyButton>Répondre (+3 points)</FocusReplyButton>
        </section>
      )}
      {d.seo && (
        <section className="card seo-card">
          <h2 className="card-title">
            <Icon name="globe" />
            Référencement
            <SeoPill seo={d.seo} />
          </h2>
          <p className="seo-reason">{d.seo.reason}</p>
          <ul className="seo-checks">
            {d.seo.checks.map(([label, ok]) => (
              <li key={label} className={ok ? "ok" : undefined}>
                <Icon name={ok ? "check" : "x"} />
                {label}
              </li>
            ))}
          </ul>
          <p className="hint">
            {d.seo.indexed
              ? "Page proposée à Google, balisée en QAPage."
              : "Page lisible par tous, balise noindex."}{" "}
            Visible uniquement par la rédaction et la modération.
          </p>
        </section>
      )}
      <section className="card">
        <h2 className="card-title">Cette discussion</h2>
        <div className="facts">
          <div>
            <small>Réponses</small>
            <b>{n}</b>
          </div>
          <div>
            <small>Utile</small>
            <b>{d.usefulTotal}</b>
          </div>
          <div>
            <small>Vues</small>
            <b>{fmt(d.views)}</b>
          </div>
          <div>
            <small>Dernière activité</small>
            <b style={{ fontSize: 13.5, fontFamily: "var(--f-body)" }}>
              {ago(d.lastActivityAt)}
            </b>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <small className="muted">Participants</small>{" "}
          <AvatarStack people={d.participants} size="sm" />
        </div>
      </section>
      {d.category && (
        <section className="card cat-card">
          <h3>
            <SpaceIcon category={d.category} />
            {d.category.name}
          </h3>
          {space?.description && <p>{space.description}</p>}
          <ComposeButton
            className="btn btn-secondary btn-sm"
            category={d.category.slug}
          >
            <Icon name="plus" />
            Publier dans cet espace
          </ComposeButton>
          {space?.rubrique && (
            <div>
              <a
                className="site-link"
                href="https://www.lerevenu.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="external" />
                La rubrique sur lerevenu.com
              </a>
            </div>
          )}
        </section>
      )}
      <EventsWidget events={events ?? []} />
    </>
  );
}

async function DiscussionView({ params }: Props) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const [d, me] = await Promise.all([
    getDiscussion((await params).slug),
    getCurrentUser(),
  ]);
  if (!d) notFound();
  const n = d.replyCount;
  const solution = d.replies.find((r) => r.isSolution);
  const context = d.participants.map((p) => p.username);

  return (
    <Layout
      active={d.category ? `cat:${d.category.slug}` : "home"}
      right={
        <Suspense fallback={null}>
          <Right d={d} />
        </Suspense>
      }
    >
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link href="/">Accueil</Link>
        {d.category && (
          <>
            <Icon name="chev" />
            <Link href={spaceHref(d.category.slug)}>{d.category.name}</Link>
          </>
        )}
      </nav>
      <article className="post post-main">
        <div className="tmeta">
          <CatTag category={d.category} />
          <TypeTag d={d} />
          {d.pinned && <PinTag />}
          <SeoPill seo={d.seo} />
        </div>
        <h1>{d.title}</h1>
        {d.author && (
          <div className="author">
            <Avatar person={d.author} size="md" />
            <div>
              <Link
                className="author-name"
                href={profileHref(d.author.username)}
                data-u={d.author.username}
              >
                {d.author.name} <RoleTags person={d.author} />
              </Link>
              <div className="author-sub">
                {ago(d.publishedAt)} ·{" "}
                <span className="num">{fmt(d.views)}</span> vues
              </div>
            </div>
          </div>
        )}
        {d.content && <Prose text={d.content} />}
        {d.articleTitle && (
          <a
            className="article-link"
            href="https://www.lerevenu.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="thumb">R</span>
            <div>
              <small>Article du Revenu</small>
              <b>{d.articleTitle}</b>
              <span className="al-cta">
                Lire sur lerevenu.com
                <Icon name="external" />
              </span>
            </div>
          </a>
        )}
        {d.type === "poll" && d.pollOptions && (
          <div style={{ marginTop: 16, maxWidth: 560 }}>
            <Poll
              discussionId={d.documentId}
              options={d.pollOptions}
              myVote={d.viewer?.myVote ?? null}
            />
          </div>
        )}
        <div className="actions">
          <UsefulButton
            targetType="discussion"
            targetId={d.documentId}
            liked={Boolean(d.viewer?.liked)}
            count={d.usefulCount}
            mine={Boolean(d.viewer?.isAuthor)}
            firstHint={d.author?.name}
          />
          <FollowButton
            discussionId={d.documentId}
            followed={Boolean(d.viewer?.followed)}
          />
          <ShareButton />
          <ReportButton targetType="discussion" targetId={d.documentId} />
        </div>
      </article>
      {solution && (
        <JumpButton targetId={`r-${solution.documentId}`}>
          <Icon name="check" />
          <div>
            <b>Meilleure réponse</b>
            {solution.verified ? " · vérifiée par la rédaction" : ""} ·{" "}
            {solution.author?.name}
            <p>{solution.content.replace(/\n+/g, " ").slice(0, 170)}…</p>
          </div>
        </JumpButton>
      )}
      <section className="replies" aria-label="Réponses">
        <h2 className="section-title">
          {n
            ? `${n} réponse${n > 1 ? "s" : ""}`
            : "Aucune réponse pour l'instant"}
        </h2>
        {d.replies.map((r) => (
          <ReplyCard key={r.documentId} d={d} r={r} />
        ))}
        {me ? (
          <ReplyBox
            targetId={d.documentId}
            label="Votre réponse"
            context={context}
            placeholder={
              d.type === "question"
                ? `Partagez votre expérience pour aider ${d.author?.name ?? "ce membre"}…`
                : "Votre avis sur la question…"
            }
          />
        ) : (
          <div className="post reply-login" id="repondre">
            <h3>Vous avez un avis ou une expérience à partager ?</h3>
            <p className="muted">
              Rejoignez la communauté avec votre compte lerevenu.com.
            </p>
            <LoginButton>Se connecter pour répondre</LoginButton>
          </div>
        )}
      </section>
      {d.related.length > 0 && d.category && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="section-title">À lire aussi dans {d.category.name}</h2>
          <div className="feed">
            {d.related.map((x) => (
              <TopicCard key={x.documentId} d={x} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

export default function DiscussionPage(props: Props) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <DiscussionView {...props} />
    </Suspense>
  );
}

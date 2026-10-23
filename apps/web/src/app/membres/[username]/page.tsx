import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar, BADGES, BadgeIcon, RoleTags } from "@/components/atoms";
import { BlogCard, TopicCard } from "@/components/feed";
import { soft } from "@/components/feed-page";
import { Icon, type IconName } from "@/components/icon";
import {
  EditProfileButton,
  PhotoEditButton,
} from "@/components/profile-buttons";
import { Layout } from "@/components/shell";
import { FeedSkeleton } from "@/components/skeletons";
import { BlogButton, ComposeButton } from "@/components/widgets";
import { discussionHref } from "@/lib/discussion-query";
import { getCurrentUser } from "@/lib/session";
import { openGraph } from "@/lib/site";
import { getLeaderboard, getProfile } from "@/lib/strapi/community";

type Props = PageProps<"/membres/[username]">;
type Tab = "billets" | "discussions" | "reponses" | "progression";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await soft(getProfile((await params).username));
  if (!p) return { title: "Membre" };
  const title = `${p.name} (@${p.username})`;
  const path = `/membres/${encodeURIComponent(p.username)}`;
  const description =
    p.bio || `Les contributions de ${p.name} à la communauté du Revenu.`;
  return {
    title,
    description,
    // Profile tabs are query variants of the same page.
    alternates: { canonical: path },
    openGraph: openGraph({
      type: "profile",
      title,
      description,
      url: path,
      username: p.username,
    }),
  };
}

const Empty = ({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) => (
  <div className="card empty">
    <h3>{title}</h3>
    <p>{text}</p>
    {action}
  </div>
);

async function ProfileView({ params, searchParams }: Props) {
  // Every view is rendered per request (relative dates, member-specific state).
  await connection();
  const { username } = await params;
  if (username === "moi") {
    const me = await getCurrentUser();
    redirect(
      me
        ? `/membres/${encodeURIComponent(me.username)}`
        : "/connexion?next=/membres/moi",
    );
  }
  const [p, levels] = await Promise.all([
    getProfile(username),
    soft(getLeaderboard("month")),
  ]);
  if (!p) notFound();
  const member = p.role === "member";
  const isMe = p.isMe;
  const L = p.level;
  const pct = L.next
    ? Math.round(((p.points - L.min) * 100) / (L.next - L.min))
    : 100;

  const tabs: Array<[Tab, IconName, string, number | null]> = [
    ["billets", "pen", "Billets", p.posts.length],
    ["discussions", "msg", "Discussions", null],
    ["reponses", "reply", "Réponses", null],
  ];
  if (member) tabs.push(["progression", "trophy", "Progression", null]);
  const requested = (await searchParams).onglet;
  const tab: Tab = tabs.some(([k]) => k === requested)
    ? (requested as Tab)
    : p.posts.length || isMe
      ? "billets"
      : "discussions";
  const href = (t: Tab) =>
    `/membres/${encodeURIComponent(p.username)}?onglet=${t}`;

  let body: React.ReactNode;
  if (tab === "billets")
    body = p.posts.length ? (
      <div className="feed">
        {p.posts.map((post) => (
          <BlogCard key={post.documentId} post={post} withAuthor={false} />
        ))}
      </div>
    ) : isMe ? (
      <Empty
        title="Votre premier billet"
        text="Un placement, une erreur, une méthode : racontez votre expérience, elle aidera d'autres lecteurs."
        action={
          <BlogButton>
            <Icon name="pen" />
            Écrire un billet
          </BlogButton>
        }
      />
    ) : (
      <Empty
        title="Aucun billet pour l'instant"
        text={`${p.name} n'a pas encore publié de billet.`}
      />
    );
  else if (tab === "discussions")
    body = p.discussions.length ? (
      <div className="feed">
        {p.discussions.map((d) => (
          <TopicCard key={d.documentId} d={d} />
        ))}
      </div>
    ) : (
      <Empty
        title="Aucune discussion"
        text={
          isMe
            ? "Posez votre première question à la communauté."
            : `${p.name} n'a pas encore lancé de discussion.`
        }
        action={
          isMe ? (
            <ComposeButton>
              <Icon name="plus" />
              Publier
            </ComposeButton>
          ) : undefined
        }
      />
    );
  else if (tab === "reponses")
    body = p.replies.length ? (
      <section className="card">
        <div className="rlist">
          {p.replies.map((r) => (
            <Link
              key={`${r.discussion.slug}-${r.publishedAt}`}
              className="ritem"
              href={discussionHref(r.discussion.slug)}
            >
              <b>{r.discussion.title}</b>
              {r.isSolution && (
                <>
                  {" "}
                  <span className="tag tag-ok">
                    <Icon name="check" />
                    Meilleure réponse
                  </span>
                </>
              )}
              <p>{r.content}</p>
            </Link>
          ))}
        </div>
      </section>
    ) : (
      <Empty
        title="Aucune réponse"
        text={
          isMe
            ? "Aidez un membre : les questions sans réponse vous attendent."
            : `${p.name} n'a pas encore répondu à une discussion.`
        }
      />
    );
  else {
    const allLevels = levels?.meta.levels ?? [];
    body = (
      <>
        <section className="card">
          <h2 className="card-title">Niveau</h2>
          <div className="prog-head" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>
                {L.name}
              </h3>
              <small>
                {L.next ? (
                  <>
                    Encore <b className="num">{L.next - p.points}</b> points
                    pour devenir « {L.nextName} »
                  </>
                ) : (
                  "Niveau maximum atteint"
                )}
              </small>
            </div>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression"
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="levels">
            {allLevels.map(([min, name], i) => (
              <div
                key={name}
                className={
                  i < L.index ? "done" : i === L.index ? "cur" : undefined
                }
              >
                {name}
                <br />
                <span className="num">{min}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h2 className="card-title">
            Badges{" "}
            <span className="num" style={{ letterSpacing: 0 }}>
              {p.badges.length}/{Object.keys(BADGES).length}
            </span>
          </h2>
          <div className="badge-grid">
            {Object.entries(BADGES).map(([code, b]) => {
              const owned = p.badges.includes(code);
              return (
                <div
                  key={code}
                  className={`badge-item${owned ? "" : " locked"}`}
                >
                  <BadgeIcon
                    code={code}
                    className={`lg${owned ? "" : " locked"}`}
                  />
                  <b>{b.name}</b>
                  <small>{b.description}</small>
                </div>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  return (
    <Layout active="">
      <section className="card prof">
        <div className="prof-av">
          <Avatar person={p} size="xl" link={false} />
          {isMe && <PhotoEditButton />}
        </div>
        <div className="grow">
          <h1>{p.name}</h1>
          <div className="sub">
            @{p.username}{" "}
            <RoleTags person={{ ...p, level: member ? L.name : null }} />
            {member && (
              <>
                {" · "}
                <Icon name="flame" /> {Math.max(1, p.streak)} jours
                d&apos;affilée
              </>
            )}
          </div>
          {p.pro && (
            <p className="pro-line">
              <Icon name="verified" />
              {p.pro} · expertise vérifiée par l&apos;équipe du Revenu
            </p>
          )}
          {p.bio ? (
            <p className="bio">{p.bio}</p>
          ) : isMe ? (
            <p className="bio muted">
              Ajoutez une courte présentation pour que les membres vous
              connaissent.
            </p>
          ) : null}
        </div>
        {isMe && (
          <div className="prof-act">
            <BlogButton>
              <Icon name="pen" />
              Écrire un billet
            </BlogButton>
            <EditProfileButton />
          </div>
        )}
      </section>
      {member && (
        <div className="stats-row">
          <div className="stat score">
            <b>{p.points}</b>
            <small>points</small>
          </div>
          <div className="stat">
            <b>{p.stats.posts}</b>
            <small>billets</small>
          </div>
          <div className="stat">
            <b>{p.stats.discussions}</b>
            <small>discussions</small>
          </div>
          <div className="stat">
            <b>{p.stats.replies}</b>
            <small>réponses</small>
          </div>
          <div className="stat">
            <b>{p.stats.usefulReceived}</b>
            <small>« Utile » reçus</small>
          </div>
          <div className="stat">
            <b>{p.stats.solutions}</b>
            <small>meilleures réponses</small>
          </div>
        </div>
      )}
      <nav className="tabs" aria-label="Activité du membre">
        {tabs.map(([key, icon, label, count]) => (
          <Link
            key={key}
            href={href(key)}
            className={`tab${tab === key ? " on" : ""}`}
            aria-current={tab === key ? "page" : undefined}
          >
            <Icon name={icon} />
            {label}
            {count !== null && <span className="n">{count}</span>}
          </Link>
        ))}
      </nav>
      {body}
    </Layout>
  );
}

export default function ProfilePage(props: Props) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <ProfileView {...props} />
    </Suspense>
  );
}

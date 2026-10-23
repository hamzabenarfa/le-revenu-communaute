import Link from "next/link";
import { discussionHref, postHref } from "@/lib/discussion-query";
import { cleanTitle } from "@/lib/format";
import type {
  DiscussionSummary,
  LeaderboardRow,
  Me,
  PostSummary,
  SiteArticle,
} from "@/lib/strapi/types";
import { Avatar, AvatarStack, BADGES, BadgeIcon, profileHref } from "./atoms";
import { Cover } from "./feed";
import { Icon } from "./icon";
import { BlogButton, ComposeButton, LoginButton } from "./widgets";

export function ProgressCard({ me }: { me: Me }) {
  const L = me.level;
  const pct = L.next
    ? Math.round(((me.points - L.min) * 100) / (L.next - L.min))
    : 100;
  const locked = Object.keys(BADGES)
    .filter((b) => !me.badges.includes(b))
    .slice(0, Math.max(0, 6 - me.badges.length));
  return (
    <section className="card">
      <h2 className="card-title">
        Votre progression
        <Link className="more" href={profileHref(me.username)}>
          Mon profil
        </Link>
      </h2>
      <div className="prog-head">
        <Avatar person={me} size="md" />
        <div>
          <h3>{L.name}</h3>
          <small>
            <span className="num">{me.points}</span> points
            {me.streak > 1 && (
              <>
                {" · "}
                <Icon name="flame" /> {me.streak} jours d&apos;affilée
              </>
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
        aria-label="Progression vers le niveau suivant"
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="prog-meta">
        <span>
          {L.next ? (
            <>
              Encore <b className="num">{L.next - me.points}</b> pts pour «{" "}
              {L.nextName} »
            </>
          ) : (
            "Niveau maximum"
          )}
        </span>
      </div>
      <div className="prog-badges">
        {me.badges.map((b) => (
          <BadgeIcon key={b} code={b} />
        ))}
        {locked.map((b) => (
          <BadgeIcon key={b} code={b} className="locked" />
        ))}
      </div>
    </section>
  );
}

export function JoinCard() {
  return (
    <section className="card join-card">
      <h3>Rejoignez la communauté</h3>
      <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
        Avec votre compte lerevenu.com, gratuitement.
      </p>
      <ul>
        <li>
          <Icon name="check" />
          Posez vos questions d&apos;argent à des milliers de lecteurs
        </li>
        <li>
          <Icon name="check" />
          Recevez les réponses de la rédaction
        </li>
        <li>
          <Icon name="check" />
          Gagnez des badges en aidant les autres
        </li>
      </ul>
      <LoginButton className="btn btn-primary btn-block">
        Rejoindre la communauté
      </LoginButton>
    </section>
  );
}

export function QuestionWidget({ question }: { question: DiscussionSummary }) {
  return (
    <section className="card w-q">
      <div className="w-label">
        <Icon name="star" />
        Question de la semaine
      </div>
      <h3>
        <Link href={discussionHref(question.slug)}>
          {cleanTitle(question.title, "Question de la semaine : ")}
        </Link>
      </h3>
      <div className="meta">
        <AvatarStack people={question.participants} />
        <span>
          <span className="num">{question.replyCount}</span> réponses · posée
          par la rédaction
        </span>
      </div>
      <Link
        className="btn btn-secondary btn-sm"
        href={`${discussionHref(question.slug)}#repondre`}
      >
        Je réponds
      </Link>
    </section>
  );
}

export function BlogWidget({
  posts,
  logged,
}: {
  posts: PostSummary[];
  logged: boolean;
}) {
  if (!posts.length) return null;
  return (
    <section className="card">
      <h2 className="card-title">
        <Icon name="pen" />
        Billets des membres
      </h2>
      <div className="rlist">
        {posts.map((p) => (
          <Link key={p.documentId} className="ritem bw" href={postHref(p.slug)}>
            <Cover post={p} className="bthumb" />
            <div>
              <b>{p.title}</b>
              <p>
                {p.author?.name} · {p.readTime} min de lecture
              </p>
            </div>
          </Link>
        ))}
      </div>
      {logged && (
        <BlogButton className="btn btn-secondary btn-sm">
          <Icon name="pen" />
          Écrire un billet
        </BlogButton>
      )}
    </section>
  );
}

export function SiteWidget({ articles }: { articles: SiteArticle[] }) {
  if (!articles.length) return null;
  return (
    <section className="card">
      <h2 className="card-title">
        <Icon name="news" />À la une sur lerevenu.com
      </h2>
      <div className="rlist">
        {articles.map((a) => (
          <a
            key={a.documentId}
            className="ritem"
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="site-kicker">{a.kicker}</span>
            <b>
              {a.paid && (
                <span className="pay-r" title="Réservé aux abonnés">
                  R
                </span>
              )}
              {a.title}
            </b>
          </a>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <a
          className="btn btn-secondary btn-sm btn-block"
          href="https://www.lerevenu.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Aller sur lerevenu.com
          <Icon name="external" />
        </a>
      </div>
    </section>
  );
}

export function TopWidget({ rows }: { rows: LeaderboardRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="card">
      <h2 className="card-title">
        <Icon name="trophy" />
        Top du mois
        <Link className="more" href="/classement">
          Classement
        </Link>
      </h2>
      <div>
        {rows.slice(0, 5).map((r, i) => (
          <div className="top-row" key={r.person.username}>
            <span className="top-rank">{i + 1}</span>
            <Avatar person={r.person} size="sm" />
            <Link
              className="top-name"
              href={profileHref(r.person.username)}
              data-u={r.person.username}
            >
              {r.person.name}
              <small>{r.level}</small>
            </Link>
            <span className="top-pts">+{r.monthPoints}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PublishHereCard({
  category,
}: {
  category: { slug: string; name: string };
}) {
  return (
    <ComposeButton
      className="btn btn-secondary btn-sm"
      category={category.slug}
    >
      <Icon name="plus" />
      Publier dans cet espace
    </ComposeButton>
  );
}

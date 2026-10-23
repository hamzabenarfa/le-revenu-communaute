import Link from "next/link";
import type { CSSProperties } from "react";
import { discussionHref, postHref } from "@/lib/discussion-query";
import { ago, fmt, fmtK, readTime, shortAgo } from "@/lib/format";
import type { DiscussionSummary, PostSummary } from "@/lib/strapi/types";
import {
  Avatar,
  AvatarStack,
  CatTag,
  PinTag,
  RoleTags,
  SeoPill,
  SpaceIcon,
  TypeTag,
} from "./atoms";
import { Icon } from "./icon";

function CountBox({ d }: { d: DiscussionSummary }) {
  const n = d.replyCount;
  const unit = n > 1 ? "réponses" : "réponse";
  if (d.type === "poll")
    return (
      <div className="tcount poll">
        <b className="num">{fmt(d.pollVotes ?? 0)}</b>
        <span>votes</span>
      </div>
    );
  if (d.solved)
    return (
      <div className="tcount solved">
        <b className="num">
          <Icon name="check" />
          {n}
        </b>
        <span>{unit}</span>
      </div>
    );
  return (
    <div className={`tcount${n ? "" : " zero"}`}>
      <b className="num">{n}</b>
      <span>{unit}</span>
    </div>
  );
}

/** Feed card (prototype `topicCard`): the whole card opens the discussion; tags and authors stay clickable. */
export function TopicCard({ d }: { d: DiscussionSummary }) {
  return (
    <article className={`tcard stretch${d.pinned ? " pinned" : ""}`}>
      <div>
        <CountBox d={d} />
      </div>
      <div>
        <div className="tmeta">
          <CatTag category={d.category} />
          <TypeTag d={d} />
          {d.pinned && <PinTag />}
          {d.isNew && <span className="tag tag-new">Nouveau</span>}
          <SeoPill seo={d.seo} />
        </div>
        <h3 className="ttitle">
          <Link className="stretch-link" href={discussionHref(d.slug)}>
            {d.title}
          </Link>
        </h3>
        <p className="texcerpt">{d.excerpt}</p>
        <div className="tfoot">
          <span className="byline">
            {d.author && <Avatar person={d.author} size="xs" />}
            <b>{d.author?.name ?? "Membre supprimé"}</b>
            {d.author?.role === "redaction" && <RoleTags person={d.author} />}
            <span>· {ago(d.publishedAt)}</span>
          </span>
          <span className="tstats">
            <AvatarStack people={d.participants} />
            <span title="Utile">
              <Icon name="thumb" />
              <span className="num">{d.usefulCount}</span>
            </span>
            <span className="views" title="Vues">
              <Icon name="eye" />
              <span className="num">{fmt(d.views)}</span>
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}

/** Compact row (prototype `topicRow`): one discussion per line, counts in columns. */
export function TopicRow({ d }: { d: DiscussionSummary }) {
  const n = d.replyCount;
  return (
    <div className={`trow stretch${d.pinned ? " pinned" : ""}`}>
      <span className="tt">
        {d.category && <SpaceIcon category={d.category} />}
        <span className="tt-main">
          <b>
            <Link className="stretch-link" href={discussionHref(d.slug)}>
              {d.title}
            </Link>
          </b>
          <span className="tt-meta">
            <small>
              {d.category?.name ?? "Sans espace"} ·{" "}
              {d.author?.name ?? "Membre supprimé"}
            </small>
            <TypeTag d={d} />
            {d.pinned && <PinTag />}
            {d.isNew && <span className="tag tag-new">Nouveau</span>}
            <SeoPill seo={d.seo} />
          </span>
        </span>
      </span>
      <span className="c-num">
        {d.solved ? (
          <span className="ok">
            <Icon name="check" />
            {n}
          </span>
        ) : (
          <span className={n ? undefined : "zero"}>{n}</span>
        )}
      </span>
      <span className="c-num c-views">{fmtK(d.views)}</span>
      <span
        className="c-num"
        title={`Dernière activité ${ago(d.lastActivityAt)}`}
      >
        {shortAgo(d.lastActivityAt)}
      </span>
    </div>
  );
}

/** Space tile used as a blog cover (no photo to provide). */
export function Cover({
  post,
  className,
}: {
  post: Pick<PostSummary, "category">;
  className: string;
}) {
  const style = {
    "--c": post.category?.color ?? "var(--blog)",
  } as CSSProperties;
  return (
    <div className={className} style={style} aria-hidden="true">
      <Icon
        name={
          (post.category?.icon as Parameters<typeof Icon>[0]["name"]) ?? "pen"
        }
      />
    </div>
  );
}

export function BlogCard({
  post,
  withAuthor = true,
}: {
  post: PostSummary;
  withAuthor?: boolean;
}) {
  return (
    <article className="bcard stretch">
      <div>
        <div className="tmeta">
          <span className="tag tag-blog">
            <Icon name="pen" />
            Billet
          </span>
          <CatTag category={post.category} />
        </div>
        <h3 className="ttitle">
          <Link className="stretch-link" href={postHref(post.slug)}>
            {post.title}
          </Link>
        </h3>
        <p className="texcerpt">{post.excerpt}</p>
        <div className="tfoot">
          <span className="byline">
            {withAuthor && post.author ? (
              <>
                <Avatar person={post.author} size="xs" />
                <b>{post.author.name}</b>
                <span>· {ago(post.publishedAt)}</span>
              </>
            ) : (
              <span>
                {ago(post.publishedAt).replace(/^./, (c) => c.toUpperCase())}
              </span>
            )}
            <span>
              · {post.readTime || readTime(post.excerpt)} min de lecture
            </span>
          </span>
          <span className="tstats">
            <span title="Utile">
              <Icon name="thumb" />
              <span className="num">{post.usefulCount}</span>
            </span>
            <span title="Commentaires">
              <Icon name="msg" />
              <span className="num">{post.commentCount}</span>
            </span>
          </span>
        </div>
      </div>
      <Cover post={post} className="bcover" />
    </article>
  );
}

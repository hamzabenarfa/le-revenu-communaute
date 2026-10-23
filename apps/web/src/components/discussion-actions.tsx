"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  chooseSolution,
  followDiscussion,
  publishReply,
  toggleUseful,
  verifyReply,
} from "@/app/actions/community";
import { useApp } from "./app/app-context";
import {
  insertAt,
  LinkNote,
  linksBlocked,
  MentionTextarea,
  useCanPostExternal,
} from "./app/mention-textarea";
import { Avatar } from "./atoms";
import { Icon } from "./icon";

type Target = "discussion" | "reply" | "post" | "comment";
const REPLY_TO = "lr:reply-to";

/** « Utile » toggle: one per member, never on one's own message (the server says so too). */
export function UsefulButton({
  targetType,
  targetId,
  liked,
  count,
  mine,
  firstHint,
}: {
  targetType: Target;
  targetId: string;
  liked: boolean;
  count: number;
  mine: boolean;
  firstHint?: string;
}) {
  const { requireLogin, handle, toast } = useApp();
  const [state, setState] = useState({ liked, count });
  useEffect(() => setState({ liked, count }), [liked, count]);
  const click = () =>
    requireLogin(async () => {
      if (mine) {
        toast(
          <>
            <Icon name="thumb" />
            <div>
              Vous ne pouvez pas marquer votre propre message comme utile.
            </div>
          </>,
        );
        return;
      }
      const data = handle(await toggleUseful(targetType, targetId), click);
      if (!data) return;
      setState(data);
      if (data.liked && firstHint) {
        try {
          if (!sessionStorage.getItem("lr-first-like")) {
            sessionStorage.setItem("lr-first-like", "1");
            toast(
              <>
                <Icon name="thumb" />
                <div>
                  <b>Merci !</b>
                  <small>{firstHint} reçoit +5 points grâce à vous.</small>
                </div>
              </>,
            );
          }
        } catch {
          /* hint shown once per tab when storage works */
        }
      }
    });
  return (
    <button
      type="button"
      className={`act useful${state.liked ? " on" : ""}`}
      aria-pressed={state.liked}
      onClick={click}
    >
      <Icon name="thumb" />
      Utile <span className="num">{state.count}</span>
    </button>
  );
}

export function FollowButton({
  discussionId,
  followed,
}: {
  discussionId: string;
  followed: boolean;
}) {
  const { requireLogin, handle, toast } = useApp();
  const [on, setOn] = useState(followed);
  useEffect(() => setOn(followed), [followed]);
  const click = () =>
    requireLogin(async () => {
      const data = handle(await followDiscussion(discussionId), click);
      if (!data) return;
      setOn(data.followed);
      toast(
        <>
          <Icon name="bell" />
          <div>
            {data.followed ? (
              <>
                <b>Discussion suivie</b>
                <small>Vous serez notifié des nouvelles réponses.</small>
              </>
            ) : (
              "Vous ne suivez plus cette discussion."
            )}
          </div>
        </>,
      );
    });
  return (
    <button
      type="button"
      className={`act${on ? " followed" : ""}`}
      aria-pressed={on}
      onClick={click}
    >
      <Icon name="bell" />
      {on ? "Suivie" : "Suivre"}
    </button>
  );
}

export function ShareButton() {
  const { toast } = useApp();
  return (
    <button
      type="button"
      className="act"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
        } catch {
          /* clipboard refused: the URL stays in the address bar */
        }
        toast(
          <>
            <Icon name="link" />
            <div>Lien copié</div>
          </>,
        );
      }}
    >
      <Icon name="link" />
      Copier le lien
    </button>
  );
}

export function ReportButton({
  targetType,
  targetId,
  iconOnly = false,
}: {
  targetType: Target;
  targetId: string;
  iconOnly?: boolean;
}) {
  const { openReport } = useApp();
  return (
    <button
      type="button"
      className="act subtle"
      aria-label={iconOnly ? "Signaler" : undefined}
      onClick={() => openReport({ targetType, targetId })}
    >
      <Icon name="flag" />
      {!iconOnly && "Signaler"}
    </button>
  );
}

export function ReplyToButton({ username }: { username: string }) {
  const { requireLogin } = useApp();
  return (
    <button
      type="button"
      className="act"
      onClick={() =>
        requireLogin(() =>
          window.dispatchEvent(new CustomEvent(REPLY_TO, { detail: username })),
        )
      }
    >
      <Icon name="reply" />
      Répondre
    </button>
  );
}

export function SolveButton({
  discussionId,
  replyId,
  isSolution,
}: {
  discussionId: string;
  replyId: string;
  isSolution: boolean;
}) {
  const { handle, toast } = useApp();
  const router = useRouter();
  const click = async () => {
    const data = handle(
      await chooseSolution(discussionId, isSolution ? null : replyId),
      click,
    );
    if (!data) return;
    router.refresh();
    if (data.solution && data.author)
      toast(
        <>
          <Icon name="check" />
          <div>
            <b>Meilleure réponse choisie</b>
            <small>
              {data.author} reçoit +20 points. Merci d&apos;avoir clôturé votre
              question !
            </small>
          </div>
        </>,
      );
  };
  return (
    <button
      type="button"
      className={`act${isSolution ? " on-ok" : ""}`}
      onClick={click}
    >
      <Icon name="check" />
      {isSolution ? "Meilleure réponse" : "Choisir comme meilleure réponse"}
    </button>
  );
}

export function VerifyButton({
  replyId,
  verified,
}: {
  replyId: string;
  verified: boolean;
}) {
  const { handle, toast } = useApp();
  const router = useRouter();
  const click = async () => {
    const data = handle(await verifyReply(replyId), click);
    if (!data) return;
    router.refresh();
    if (data.verified)
      toast(
        <>
          <Icon name="verified" />
          <div>
            <b>Réponse validée par la rédaction</b>
            <small>
              La mention s&apos;affiche sous la réponse et renforce son
              référencement.
            </small>
          </div>
        </>,
      );
  };
  return (
    <button
      type="button"
      className={`act${verified ? " on-ok" : ""}`}
      onClick={click}
    >
      <Icon name="verified" />
      {verified ? "Vérifiée par la rédaction" : "Valider cette réponse"}
    </button>
  );
}

/** Scrolls to an answer and flashes it (best-answer call-out, new reply). */
export function flash(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

export function JumpButton({
  targetId,
  children,
}: {
  targetId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="solution-call"
      onClick={() => flash(targetId)}
    >
      {children}
    </button>
  );
}

export function FocusReplyButton({ children }: { children: React.ReactNode }) {
  const { requireLogin } = useApp();
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={() =>
        requireLogin(() =>
          setTimeout(() => {
            const ta = document.getElementById("reply-body");
            ta?.scrollIntoView({ behavior: "smooth", block: "center" });
            ta?.focus({ preventScroll: true });
          }, 50),
        )
      }
    >
      {children}
    </button>
  );
}

/**
 * Always-open reply box (prototype `reply-box`), with @mentions, link policy and
 * Ctrl+Enter. Also used for blog comments through `publish`.
 */
export function ReplyBox({
  targetId,
  placeholder,
  context,
  label,
  verb = "Répondre",
  publish = publishReply,
  successToast,
}: {
  targetId: string;
  placeholder: string;
  context: string[];
  label: string;
  verb?: string;
  publish?: (
    id: unknown,
    content: unknown,
  ) => Promise<
    | Awaited<ReturnType<typeof publishReply>>
    | Awaited<
        ReturnType<typeof import("@/app/actions/community").publishComment>
      >
  >;
  successToast?: string;
}) {
  const { me, handle, toast } = useApp();
  const router = useRouter();
  const canPostExternal = useCanPostExternal();
  const draftKey = `lr-reply:${targetId}`;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setValue(sessionStorage.getItem(draftKey) ?? "");
    } catch {
      /* no draft */
    }
  }, [draftKey]);
  const update = (v: string) => {
    setValue(v);
    try {
      sessionStorage.setItem(draftKey, v);
    } catch {
      /* draft not kept */
    }
  };
  useEffect(() => {
    const onReplyTo = (e: Event) => {
      const username = (e as CustomEvent<string>).detail;
      const next = `${value ? `${value} ` : ""}@${username} `;
      update(next);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(next.length, next.length);
      });
    };
    window.addEventListener(REPLY_TO, onReplyTo);
    return () => window.removeEventListener(REPLY_TO, onReplyTo);
  });

  if (!me) return null;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = value.trim();
    if (body.length < 2) {
      ref.current?.focus();
      return;
    }
    if (linksBlocked(body, canPostExternal)) {
      ref.current?.focus();
      return;
    }
    setBusy(true);
    const result = await publish(targetId, body);
    setBusy(false);
    const data = handle(result, () => void submit());
    if (!data) return;
    update("");
    router.refresh();
    if (successToast)
      toast(
        <>
          <Icon name="check" />
          <div>{successToast}</div>
        </>,
      );
    const mentioned = "mentioned" in data ? data.mentioned : [];
    if (mentioned.length) {
      const who =
        mentioned.length > 1
          ? `${mentioned.slice(0, -1).join(", ")} et ${mentioned[mentioned.length - 1]}`
          : mentioned[0];
      setTimeout(
        () =>
          toast(
            <>
              <Icon name="at" />
              <div>
                <b>
                  {who} {mentioned.length > 1 ? "recevront" : "recevra"} une
                  notification
                </b>
                <small>Grâce à votre mention dans ce message.</small>
              </div>
            </>,
          ),
        1300,
      );
    }
    if ("documentId" in data)
      setTimeout(() => flash(`r-${data.documentId}`), 600);
  };

  return (
    <form className="post reply-box" id="repondre" onSubmit={submit}>
      <div className="author">
        <Avatar person={me} size="sm" link={false} />
        <div className="author-sub">
          {verb} en tant que <b style={{ color: "var(--ink)" }}>{me.name}</b>
        </div>
      </div>
      <label htmlFor="reply-body" className="sr-only">
        {label}
      </label>
      <MentionTextarea
        id="reply-body"
        value={value}
        onChange={update}
        context={context}
        placeholder={placeholder}
        textareaRef={ref}
        onSubmitShortcut={() => void submit()}
      />
      <LinkNote text={value} canPostExternal={canPostExternal} />
      <div className="reply-foot">
        <div className="tools">
          <button
            type="button"
            className="act"
            onClick={() => insertAt(ref.current, value, update)}
          >
            <Icon name="at" />
            Mentionner
          </button>
          <span className="hint">ou tapez @ · Ctrl + Entrée pour publier</span>
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={busy}
          aria-busy={busy}
        >
          {verb === "Commenter"
            ? "Publier mon commentaire"
            : "Publier ma réponse"}
        </button>
      </div>
    </form>
  );
}

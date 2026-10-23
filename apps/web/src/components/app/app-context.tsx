"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActionResult } from "@/app/actions/result";
import type { Me, Reward, Space } from "@/lib/strapi/types";
import { BadgeIcon } from "../atoms";
import { Icon } from "../icon";
import { type ToastItem, Toasts } from "./toasts";

export interface ComposerOptions {
  type?: "question" | "discussion" | "poll";
  category?: string;
  title?: string;
}

export interface ReportTarget {
  targetType: "discussion" | "reply" | "post" | "comment";
  targetId: string;
}

type ModalState =
  | { kind: "login" }
  | { kind: "onboarding"; edit: boolean }
  | { kind: "composer"; options: ComposerOptions }
  | { kind: "blog" }
  | { kind: "photo" }
  | { kind: "report"; target: ReportTarget }
  | null;

interface AppContextValue {
  me: Me | null;
  spaces: Space[];
  modal: ModalState;
  setMe: (me: Me | null) => void;
  closeModal: () => void;
  toast: (
    content: ReactNode,
    options?: { className?: string; ms?: number },
  ) => void;
  showReward: (reward: Reward | null | undefined) => void;
  /** Runs `action` now when signed in, otherwise after login (like the prototype's requireLogin). */
  requireLogin: (action?: () => void) => void;
  /** Handles the generic part of an action result: login prompt, error toast. Returns the data on success. */
  handle: <T>(result: ActionResult<T>, retry?: () => void) => T | null;
  openComposer: (options?: ComposerOptions) => void;
  openOnboarding: (edit?: boolean) => void;
  openBlogEditor: () => void;
  openPhoto: () => void;
  openReport: (target: ReportTarget) => void;
  /** Called by the login/onboarding modals when the member is ready. */
  completeLogin: (me: Me) => void;
  completeOnboarding: (me: Me) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}

export function AppProvider({
  initialMe,
  spaces,
  children,
}: {
  initialMe: Me | null;
  spaces: Space[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(initialMe);
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pending = useRef<(() => void) | null>(null);
  // The server is the source of truth for the session: follow it after every refresh.
  useEffect(() => setMe(initialMe), [initialMe]);
  const nextId = useRef(1);

  const toast = useCallback(
    (content: ReactNode, options: { className?: string; ms?: number } = {}) => {
      const id = nextId.current++;
      const ms = options.ms ?? 4200;
      setToasts((list) => [
        ...list,
        { id, content, className: options.className },
      ]);
      setTimeout(
        () =>
          setToasts((list) =>
            list.map((t) => (t.id === id ? { ...t, out: true } : t)),
          ),
        ms,
      );
      setTimeout(
        () => setToasts((list) => list.filter((t) => t.id !== id)),
        ms + 350,
      );
    },
    [],
  );

  const showReward = useCallback(
    (reward: Reward | null | undefined) => {
      if (!reward) return;
      if (reward.points > 0) {
        toast(
          <>
            <span className="pts">+{reward.points}</span>
            <div>
              {reward.reason}
              <small>{reward.total} points au total</small>
            </div>
          </>,
        );
      }
      if (reward.level) {
        setTimeout(
          () =>
            toast(
              <>
                <Icon name="trophy" />
                <div>
                  <b>Niveau supérieur !</b>
                  <small>Vous êtes maintenant « {reward.level} »</small>
                </div>
              </>,
              { className: "level", ms: 5200 },
            ),
          700,
        );
      }
      reward.badges.forEach((b, i) => {
        setTimeout(
          () =>
            toast(
              <>
                <BadgeIcon code={b.code} />
                <div>
                  <b>Nouveau badge : {b.name}</b>
                  <small>{b.description}</small>
                </div>
              </>,
              { ms: 5200 },
            ),
          900 + i * 400,
        );
      });
    },
    [toast],
  );

  const runPending = useCallback(() => {
    const fn = pending.current;
    pending.current = null;
    if (fn) setTimeout(fn, 400);
  }, []);

  const requireLogin = useCallback(
    (action?: () => void) => {
      if (me) {
        action?.();
        return;
      }
      pending.current = action ?? null;
      setModal({ kind: "login" });
    },
    [me],
  );

  const handle = useCallback(
    <T,>(result: ActionResult<T>, retry?: () => void): T | null => {
      if (result.ok) {
        showReward(result.reward);
        return result.data;
      }
      if (result.needsLogin) {
        setMe(null);
        pending.current = retry ?? null;
        setModal({ kind: "login" });
        return null;
      }
      toast(
        <>
          <Icon name="alert" />
          <div>{result.error}</div>
        </>,
      );
      return null;
    },
    [showReward, toast],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      me,
      spaces,
      modal,
      setMe,
      closeModal: () => setModal(null),
      toast,
      showReward,
      requireLogin,
      handle,
      openComposer: (options = {}) =>
        requireLogin(() => setModal({ kind: "composer", options })),
      openOnboarding: (edit = false) => setModal({ kind: "onboarding", edit }),
      openBlogEditor: () => requireLogin(() => setModal({ kind: "blog" })),
      openPhoto: () => requireLogin(() => setModal({ kind: "photo" })),
      openReport: (target) =>
        requireLogin(() => setModal({ kind: "report", target })),
      completeLogin: (member) => {
        setMe(member);
        router.refresh();
        if (!member.onboarded) setModal({ kind: "onboarding", edit: false });
        else {
          setModal(null);
          runPending();
        }
      },
      completeOnboarding: (member) => {
        setMe(member);
        setModal(null);
        router.refresh();
        runPending();
      },
    }),
    [
      me,
      spaces,
      modal,
      toast,
      showReward,
      requireLogin,
      handle,
      router,
      runPending,
    ],
  );

  return (
    <AppContext value={value}>
      {children}
      <Toasts items={toasts} />
    </AppContext>
  );
}

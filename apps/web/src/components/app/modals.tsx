"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import {
  loadSimilar,
  publishDiscussion,
  publishPost,
  reportMessage,
  savePhoto,
  saveProfile,
} from "@/app/actions/community";
import type { FieldErrors } from "@/lib/strapi/errors";
import type { SimilarDiscussion } from "@/lib/strapi/types";
import { Avatar, SpaceIcon } from "../atoms";
import { Icon, type IconName } from "../icon";
import { type ComposerOptions, type ReportTarget, useApp } from "./app-context";
import {
  insertAt,
  LinkNote,
  linksBlocked,
  MentionTextarea,
  useCanPostExternal,
} from "./mention-textarea";
import { Modal } from "./modal";

const Err = ({ id, msg }: { id: string; msg?: string }) =>
  msg ? (
    <span className="err-msg" id={id}>
      {msg}
    </span>
  ) : null;

/** Drafts survive closing the dialog (per tab), like the prototype's "brouillon enregistré". */
function useDraft<T>(key: string, initial: T): [T, (v: T) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  const save = (v: T) => {
    setValue(v);
    try {
      sessionStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage unavailable (private mode): the draft simply isn't kept */
    }
  };
  const clear = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  };
  return [value, save, clear];
}

function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-primary"
      type="submit"
      disabled={busy}
      aria-busy={busy}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Login */

function LoginModal() {
  const { closeModal, completeLogin } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await (mode === "login" ? signIn : signUp)(
      new FormData(e.currentTarget),
    );
    setBusy(false);
    if (result.ok) completeLogin(result.data);
    else {
      setError(result.error);
      setFields(result.fieldErrors ?? {});
    }
  };

  return (
    <Modal
      title={
        mode === "login" ? "Rejoindre la communauté" : "Créer un compte gratuit"
      }
      size="sm"
      onClose={closeModal}
    >
      <form onSubmit={submit} noValidate>
        <div className="m-body">
          <div className="steps">
            <span className="on" />
            <span />
          </div>
          <ul className="benefits">
            <li>
              <Icon name="check" />
              Posez vos questions d&apos;argent aux lecteurs et à la rédaction
            </li>
            <li>
              <Icon name="check" />
              Suivez les discussions qui vous concernent
            </li>
            <li>
              <Icon name="check" />
              Gagnez des badges en aidant les autres
            </li>
          </ul>
          <div className="sso">
            <span className="logo">R</span>
            <div>
              <b>Votre compte lerevenu.com</b>
              <small>Le même identifiant que pour le site et le magazine</small>
            </div>
          </div>
          {error && !Object.keys(fields).length && (
            <p className="err-msg" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label htmlFor="lg-mail">Adresse e-mail</label>
            <input
              className={`input${fields.identifier ? " err" : ""}`}
              id="lg-mail"
              name="identifier"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              aria-describedby={fields.identifier ? "lg-mail-err" : undefined}
            />
            <Err id="lg-mail-err" msg={fields.identifier} />
          </div>
          <div className="field">
            <label htmlFor="lg-pw">Mot de passe</label>
            <input
              className={`input${fields.password ? " err" : ""}`}
              id="lg-pw"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              aria-describedby={fields.password ? "lg-pw-err" : undefined}
            />
            <Err id="lg-pw-err" msg={fields.password} />
          </div>
          <Submit busy={busy}>
            {mode === "login" ? "Continuer" : "Créer mon compte"}
          </Submit>
          <p className="hint" style={{ textAlign: "center" }}>
            {mode === "login" ? "Pas encore de compte ? " : "Déjà membre ? "}
            <button
              type="button"
              style={{ color: "var(--brand-text)", fontWeight: 600 }}
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setFields({});
              }}
            >
              {mode === "login" ? "Créer un compte gratuit" : "Se connecter"}
            </button>
          </p>
          <p className="hint" style={{ textAlign: "center" }}>
            Démo : <b>demo@demo.fr</b>, avec le même texte comme mot de passe.
          </p>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------- Onboarding */

function OnboardingModal({ edit }: { edit: boolean }) {
  const { me, spaces, closeModal, completeOnboarding, handle, toast } =
    useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pseudo = String(form.get("pseudo") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (pseudo.length < 3) {
      setError("Choisissez un pseudo d'au moins 3 caractères.");
      e.currentTarget.querySelector<HTMLInputElement>("#ob-name")?.focus();
      return;
    }
    setBusy(true);
    const result = await saveProfile({
      displayName: pseudo,
      bio: String(form.get("bio") ?? ""),
      interests: form.getAll("i"),
    });
    setBusy(false);
    if (!result.ok && result.fieldErrors?.displayName) {
      setError(result.fieldErrors.displayName);
      return;
    }
    const saved = handle(result);
    if (!saved) return;
    if (edit)
      toast(
        <>
          <Icon name="check" />
          <div>Profil enregistré</div>
        </>,
      );
    completeOnboarding(saved);
  };

  return (
    <Modal
      title={edit ? "Modifier mon profil" : "Qu'est-ce qui vous intéresse ?"}
      onClose={closeModal}
    >
      <form onSubmit={submit} noValidate>
        <div className="m-body">
          {!edit && (
            <>
              <div className="steps">
                <span className="on" />
                <span className="on" />
              </div>
              <p className="muted">
                Choisissez au moins un sujet : votre fil « Pour vous » sera
                composé à partir de ces espaces.
              </p>
            </>
          )}
          <div className="field">
            <label htmlFor="ob-name">Votre pseudo</label>
            <input
              className={`input${error ? " err" : ""}`}
              id="ob-name"
              name="pseudo"
              defaultValue={edit ? me?.name : ""}
              maxLength={24}
              autoComplete="off"
              placeholder="Ex. : EpargnantDuNord"
              aria-describedby={error ? "ob-err" : "ob-hint"}
            />
            <Err id="ob-err" msg={error ?? undefined} />
            <span className="hint" id="ob-hint">
              {edit
                ? `Votre identifiant pour les mentions reste @${me?.username}.`
                : "Un pseudonyme suffit : votre nom n'est jamais affiché. Il sert aussi d'identifiant pour les mentions (@…)."}
            </span>
          </div>
          <fieldset className="interests" aria-label="Centres d'intérêt">
            {spaces.map((s) => (
              <label key={s.documentId} className="interest">
                <input
                  type="checkbox"
                  name="i"
                  value={s.documentId}
                  defaultChecked={me?.interestIds.includes(s.documentId)}
                />
                <SpaceIcon category={s} />
                {s.name}
                <span className="chk">
                  <Icon name="check" />
                </span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="ob-bio">
              Présentez-vous en une phrase{" "}
              <span className="muted" style={{ fontWeight: 400 }}>
                (facultatif)
              </span>
            </label>
            <input
              className="input"
              id="ob-bio"
              name="bio"
              maxLength={160}
              defaultValue={me?.bio ?? ""}
              placeholder="Ex. : 35 ans, je prépare l'achat de ma résidence principale"
            />
          </div>
        </div>
        <div className="m-foot">
          <span className="hint">
            {edit ? "" : "Modifiable à tout moment depuis votre profil"}
          </span>
          <Submit busy={busy}>{edit ? "Enregistrer" : "C'est parti"}</Submit>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------- Composer */

const TYPES: Array<
  [NonNullable<ComposerOptions["type"]>, IconName, string, string]
> = [
  [
    "question",
    "help",
    "Poser une question",
    "Obtenez l'aide des membres et de la rédaction",
  ],
  [
    "discussion",
    "msg",
    "Lancer une discussion",
    "Partagez une expérience, un avis, une actualité",
  ],
  [
    "poll",
    "chart",
    "Créer un sondage",
    "Recueillez l'avis de la communauté en un clic",
  ],
];
const PLACEHOLDER = {
  question: "Ex. : Faut-il ouvrir un PER à 45 ans ?",
  discussion:
    "Ex. : Mon retour d'expérience sur la renégociation de mon crédit",
  poll: "Ex. : Combien de temps passez-vous à suivre vos placements ?",
};

interface ComposerDraft {
  type: NonNullable<ComposerOptions["type"]>;
  title: string;
  category: string;
  content: string;
  options: string[];
}

function ComposerModal({ options }: { options: ComposerOptions }) {
  const { spaces, closeModal, handle, toast } = useApp();
  const router = useRouter();
  const canPostExternal = useCanPostExternal();
  const initialCategory = options.category
    ? (spaces.find((s) => s.slug === options.category)?.documentId ?? "")
    : "";
  const [draft, setDraft, clearDraft] = useDraft<ComposerDraft>("lr-composer", {
    type: "question",
    title: "",
    category: "",
    content: "",
    options: ["", ""],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [similar, setSimilar] = useState<SimilarDiscussion[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the opening options seed the draft once, when the dialog opens
  useEffect(() => {
    if (options.type || options.category || options.title)
      setDraft({
        ...draft,
        type: options.type ?? draft.type,
        category: initialCategory || draft.category,
        title: options.title ?? draft.title,
      });
    // Only the opening options seed the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const result = await loadSimilar(draft.title);
      if (result.ok) setSimilar(result.data);
    }, 250);
    return () => clearTimeout(t);
  }, [draft.title]);

  const update = (patch: Partial<ComposerDraft>) =>
    setDraft({ ...draft, ...patch });

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const title = draft.title.trim().replace(/\s+/g, " ");
    const pollOptions = draft.options.map((o) => o.trim()).filter(Boolean);
    const next: FieldErrors = {};
    if (title.length < 10)
      next.title =
        "Ajoutez quelques mots : un titre précis obtient plus de réponses (10 caractères minimum).";
    if (!draft.category) next.category = "Choisissez l'espace où publier.";
    if (draft.type !== "poll" && !draft.content.trim())
      next.content = "Décrivez votre situation : le contenu est obligatoire.";
    if (draft.type === "poll" && pollOptions.length < 2)
      next.pollOptions = "Un sondage a besoin d'au moins deux réponses.";
    if (linksBlocked(draft.content, canPostExternal))
      next.content = "Retirez les liens non autorisés pour publier.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await publishDiscussion({
      title,
      content: draft.content,
      type: draft.type,
      category: draft.category,
      ...(draft.type === "poll" ? { pollOptions } : {}),
    });
    setBusy(false);
    if (
      !result.ok &&
      result.fieldErrors &&
      Object.keys(result.fieldErrors).length
    ) {
      setErrors(result.fieldErrors);
      return;
    }
    const created = handle(result, () => void submit());
    if (!created) return;
    clearDraft();
    closeModal();
    router.push(`/discussions/${encodeURIComponent(created.slug)}`);
    toast(
      <>
        <Icon name="bell" />
        <div>
          <b>Vous suivez cette discussion</b>
          <small>Vous serez notifié dès qu&apos;un membre répond.</small>
        </div>
      </>,
      { ms: 5000 },
    );
  };

  return (
    <Modal title="Nouvelle publication" onClose={closeModal}>
      <form onSubmit={submit} noValidate>
        <div className="m-body">
          <div
            className="types"
            role="radiogroup"
            aria-label="Type de publication"
          >
            {TYPES.map(([value, icon, label, hint]) => (
              <label key={value} className="type">
                <input
                  type="radio"
                  name="type"
                  value={value}
                  checked={draft.type === value}
                  onChange={() => update({ type: value })}
                />
                <Icon name={icon} />
                <b>{label}</b>
                <small>{hint}</small>
              </label>
            ))}
          </div>
          <div className="field">
            <label htmlFor="c-title">Titre</label>
            <input
              className={`input${errors.title ? " err" : ""}`}
              id="c-title"
              maxLength={150}
              autoComplete="off"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={PLACEHOLDER[draft.type]}
              aria-describedby={errors.title ? "c-title-err" : "c-title-hint"}
            />
            <Err id="c-title-err" msg={errors.title} />
            <span className="hint" id="c-title-hint">
              Un titre clair, formulé comme une question, obtient plus vite des
              réponses.
            </span>
          </div>
          {similar.length > 0 && (
            <div className="similar">
              <b>
                <Icon name="search" />
                Ces discussions répondent peut-être déjà à votre question
              </b>
              {similar.map((s) => (
                <a
                  key={s.documentId}
                  href={`/discussions/${encodeURIComponent(s.slug)}`}
                  onClick={() => closeModal()}
                >
                  <span>{s.title}</span>
                  <small>
                    {s.solved ? "Résolu · " : ""}
                    {s.replyCount} rép.
                  </small>
                </a>
              ))}
            </div>
          )}
          <div className="field">
            <label htmlFor="c-cat">Espace</label>
            <select
              className={`input${errors.category ? " err" : ""}`}
              id="c-cat"
              value={draft.category}
              onChange={(e) => update({ category: e.target.value })}
              aria-describedby={errors.category ? "c-cat-err" : undefined}
            >
              <option value="">Choisissez un espace…</option>
              {spaces.map((s) => (
                <option key={s.documentId} value={s.documentId}>
                  {s.name}
                </option>
              ))}
            </select>
            <Err id="c-cat-err" msg={errors.category} />
          </div>
          <div className="field">
            <label htmlFor="c-body">
              Détails{" "}
              {draft.type === "poll" && (
                <span className="muted" style={{ fontWeight: 400 }}>
                  (facultatif)
                </span>
              )}
            </label>
            <MentionTextarea
              id="c-body"
              className={`input${errors.content ? " err" : ""}`}
              rows={5}
              value={draft.content}
              onChange={(content) => update({ content })}
              context={[]}
              textareaRef={bodyRef}
              invalid={Boolean(errors.content)}
              describedBy={errors.content ? "c-body-err" : undefined}
              placeholder="Votre situation, ce que vous avez déjà envisagé… Plus le contexte est précis, meilleures sont les réponses."
              onSubmitShortcut={() => void submit()}
            />
            <LinkNote text={draft.content} canPostExternal={canPostExternal} />
            <Err id="c-body-err" msg={errors.content} />
            <div className="tools">
              <button
                type="button"
                className="act"
                onClick={() =>
                  insertAt(bodyRef.current, draft.content, (content) =>
                    update({ content }),
                  )
                }
              >
                <Icon name="at" />
                Mentionner
              </button>
              <span className="hint">
                Tapez @ pour citer un membre ou la rédaction
              </span>
            </div>
          </div>
          {draft.type === "poll" && (
            <div className="field">
              <span className="field-label">Réponses possibles</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {draft.options.map((o, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: options are positional and never reordered
                  <div className="opt-row" key={i}>
                    <input
                      className="input"
                      value={o}
                      placeholder={`Réponse ${i + 1}`}
                      maxLength={80}
                      aria-label={`Réponse ${i + 1}`}
                      onChange={(e) =>
                        update({
                          options: draft.options.map((x, k) =>
                            k === i ? e.target.value : x,
                          ),
                        })
                      }
                    />
                    {i > 1 && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Retirer cette réponse"
                        onClick={() =>
                          update({
                            options: draft.options.filter((_, k) => k !== i),
                          })
                        }
                      >
                        <Icon name="x" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Err id="c-poll-err" msg={errors.pollOptions} />
              {draft.options.length < 6 && (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => update({ options: [...draft.options, ""] })}
                >
                  <Icon name="plus" />
                  Ajouter une réponse
                </button>
              )}
            </div>
          )}
          <p className="compliance">
            <Icon name="shield" />
            <span>
              Partagez votre expérience : pas de conseil personnalisé ni de
              sollicitation. <a href="/charte">Lire la charte</a>
            </span>
          </p>
        </div>
        <div className="m-foot">
          <span className="hint">Brouillon enregistré automatiquement</span>
          <Submit busy={busy}>Publier</Submit>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------- Blog editor */

function BlogEditorModal() {
  const { spaces, closeModal, handle } = useApp();
  const router = useRouter();
  const canPostExternal = useCanPostExternal();
  const [draft, setDraft, clearDraft] = useDraft("lr-blog", {
    title: "",
    category: "",
    content: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const title = draft.title.trim().replace(/\s+/g, " ");
    const next: FieldErrors = {};
    if (title.length < 10)
      next.title = "Donnez un titre à votre billet (10 caractères minimum).";
    if (draft.content.trim().length < 60)
      next.content =
        "Développez un peu votre récit : quelques phrases suffisent (60 caractères minimum).";
    if (linksBlocked(draft.content, canPostExternal))
      next.content = "Retirez les liens non autorisés pour publier.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await publishPost({
      title,
      content: draft.content,
      category: draft.category || null,
    });
    setBusy(false);
    if (
      !result.ok &&
      result.fieldErrors &&
      Object.keys(result.fieldErrors).length
    ) {
      setErrors(result.fieldErrors);
      return;
    }
    const created = handle(result, () => void submit());
    if (!created) return;
    clearDraft();
    closeModal();
    router.push(`/billets/${encodeURIComponent(created.slug)}`);
  };

  return (
    <Modal title="Nouveau billet" onClose={closeModal}>
      <form onSubmit={submit} noValidate>
        <div className="m-body">
          <p className="muted">
            Votre billet sera publié sur votre profil et proposé aux membres sur
            l&apos;accueil.
          </p>
          <div className="field">
            <label htmlFor="b-title">Titre</label>
            <input
              className={`input${errors.title ? " err" : ""}`}
              id="b-title"
              maxLength={120}
              autoComplete="off"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Ex. : Mon bilan après cinq ans de versements programmés"
              aria-describedby={errors.title ? "b-title-err" : undefined}
            />
            <Err id="b-title-err" msg={errors.title} />
          </div>
          <div className="field">
            <label htmlFor="b-cat">
              Thème{" "}
              <span className="muted" style={{ fontWeight: 400 }}>
                (facultatif)
              </span>
            </label>
            <select
              className="input"
              id="b-cat"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              <option value="">Aucun thème</option>
              {spaces.map((s) => (
                <option key={s.documentId} value={s.documentId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="b-body">Votre billet</label>
            <MentionTextarea
              id="b-body"
              className={`input${errors.content ? " err" : ""}`}
              rows={10}
              value={draft.content}
              onChange={(content) => setDraft({ ...draft, content })}
              context={[]}
              textareaRef={bodyRef}
              invalid={Boolean(errors.content)}
              describedBy={errors.content ? "b-body-err" : undefined}
              placeholder="Racontez votre expérience : le contexte, ce que vous avez fait, ce que vous en retenez."
              onSubmitShortcut={() => void submit()}
            />
            <LinkNote text={draft.content} canPostExternal={canPostExternal} />
            <Err id="b-body-err" msg={errors.content} />
            <div className="tools">
              <button
                type="button"
                className="act"
                onClick={() =>
                  insertAt(bodyRef.current, draft.content, (content) =>
                    setDraft({ ...draft, content }),
                  )
                }
              >
                <Icon name="at" />
                Mentionner
              </button>
              <span className="hint">
                **gras** · une ligne commençant par « - » crée une liste
              </span>
            </div>
          </div>
          <p className="compliance">
            <Icon name="shield" />
            <span>
              Racontez votre expérience : pas de conseil personnalisé ni de
              sollicitation. <a href="/charte">Lire la charte</a>
            </span>
          </p>
        </div>
        <div className="m-foot">
          <span className="hint">Brouillon enregistré automatiquement</span>
          <Submit busy={busy}>Publier le billet</Submit>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Photo */

/** Square centre crop, reduced to 256 px: the photo stays light whatever the source. */
function squarePhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas
        .getContext("2d")
        ?.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          256,
          256,
        );
      URL.revokeObjectURL(src);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("crop failed"))),
        "image/jpeg",
        0.86,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("unreadable image"));
    };
    img.src = src;
  });
}

function PhotoModal() {
  const { me, closeModal, handle, toast, setMe } = useApp();
  const [draft, setDraft] = useState<{
    blob: Blob | null;
    url: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const preview = draft ? draft.url : me.photo;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await squarePhoto(file);
      setDraft({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast(
        <>
          <Icon name="camera" />
          <div>
            Cette image n&apos;a pas pu être lue. Essayez un fichier JPG ou PNG.
          </div>
        </>,
      );
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) {
      closeModal();
      toast(
        <>
          <Icon name="camera" />
          <div>Aucune modification</div>
        </>,
      );
      return;
    }
    setBusy(true);
    const form = new FormData();
    if (draft.blob) form.append("photo", draft.blob, "avatar.jpg");
    const result = await savePhoto(form);
    setBusy(false);
    const saved = handle(result);
    if (!saved) return;
    setMe(saved);
    closeModal();
    toast(
      <>
        <Icon name="camera" />
        <div>
          {saved.photo ? "Photo de profil mise à jour" : "Photo retirée"}
        </div>
      </>,
    );
  };

  return (
    <Modal title="Photo de profil" size="sm" onClose={closeModal}>
      <form onSubmit={submit}>
        <div className="m-body ph-body">
          <div className="ph-preview">
            <Avatar person={{ ...me, photo: preview }} size="xl" link={false} />
          </div>
          <p className="muted" style={{ textAlign: "center" }}>
            Une photo rend vos échanges plus personnels. Elle est visible par
            tous les membres.
          </p>
          <div className="ph-actions">
            <label className="btn btn-secondary">
              <Icon name="camera" />
              Choisir une image…
              <input
                type="file"
                className="sr-file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void choose(e.target.files?.[0])}
              />
            </label>
            {preview && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setDraft({ blob: null, url: null })}
              >
                Retirer la photo
              </button>
            )}
          </div>
          <p className="hint" style={{ textAlign: "center" }}>
            JPG, PNG ou WebP · recadrée automatiquement
          </p>
        </div>
        <div className="m-foot">
          <button type="button" className="btn btn-quiet" onClick={closeModal}>
            Annuler
          </button>
          <Submit busy={busy}>Enregistrer</Submit>
        </div>
      </form>
    </Modal>
  );
}

/* --------------------------------------------------------------- Report */

const REASONS: Array<[string, string]> = [
  ["disrespect", "Propos irrespectueux"],
  ["solicitation", "Publicité ou sollicitation"],
  ["market-rumor", "Rumeur de marché ou incitation à acheter ou vendre"],
  ["personal-data", "Informations personnelles exposées"],
  ["other", "Autre motif"],
];

function ReportModal({ target }: { target: ReportTarget }) {
  const { closeModal, handle, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const result = await reportMessage(
      target.targetType,
      target.targetId,
      new FormData(e.currentTarget).get("reason"),
    );
    setBusy(false);
    if (handle(result) === null && !result.ok) return;
    closeModal();
    toast(
      <>
        <Icon name="shield" />
        <div>
          <b>Signalement envoyé</b>
          <small>
            Merci, l&apos;équipe de modération va examiner ce message.
          </small>
        </div>
      </>,
    );
  };
  return (
    <Modal title="Signaler ce message" size="sm" onClose={closeModal}>
      <form onSubmit={submit}>
        <div className="m-body">
          <p className="muted">
            Votre signalement est anonyme. L&apos;équipe de modération
            l&apos;examine rapidement.
          </p>
          <div className="radio-list">
            {REASONS.map(([value, label], i) => (
              <label key={value}>
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  defaultChecked={i === 0}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="m-foot">
          <button type="button" className="btn btn-quiet" onClick={closeModal}>
            Annuler
          </button>
          <Submit busy={busy}>Envoyer le signalement</Submit>
        </div>
      </form>
    </Modal>
  );
}

/** Renders whichever dialog is open. */
export function ModalHost() {
  const { modal } = useApp();
  if (!modal) return null;
  switch (modal.kind) {
    case "login":
      return <LoginModal />;
    case "onboarding":
      return <OnboardingModal edit={modal.edit} />;
    case "composer":
      return <ComposerModal options={modal.options} />;
    case "blog":
      return <BlogEditorModal />;
    case "photo":
      return <PhotoModal />;
    case "report":
      return <ReportModal target={modal.target} />;
  }
}

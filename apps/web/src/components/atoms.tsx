import Link from "next/link";
import type { CSSProperties } from "react";
import { initials } from "@/lib/format";
import type {
  CategoryRef,
  DiscussionSummary,
  Person,
  SeoStatus,
} from "@/lib/strapi/types";
import { Icon, type IconName } from "./icon";

const ICON_NAMES = new Set<string>([
  "candles",
  "globe",
  "piggy",
  "umbrella",
  "building",
  "receipt",
  "armchair",
  "family",
  "gem",
  "wallet",
  "coffee",
  "msg",
]);
const asIcon = (name: string | null | undefined): IconName =>
  name && ICON_NAMES.has(name) ? (name as IconName) : "msg";
const tint = (color: string | null | undefined) =>
  ({ "--c": color ?? "#6e6e73" }) as CSSProperties;

/** Identity fields an avatar needs (a full Person, the signed-in member, a hover card…). */
export type AvatarPerson = Pick<
  Person,
  "username" | "name" | "color" | "photo" | "role" | "pro"
>;

export const profileHref = (username: string) =>
  `/membres/${encodeURIComponent(username)}`;
export const spaceHref = (slug: string) =>
  `/espaces/${encodeURIComponent(slug)}`;

/** Monogram or photo avatar; links to the profile and opens the hover card (data-u). */
export function Avatar({
  person,
  size = "sm",
  link = true,
}: {
  person: AvatarPerson;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  link?: boolean;
}) {
  const cls = `av av-${size}${person.role === "redaction" ? " redac" : ""}${person.pro ? " pro" : ""}`;
  const label = initials(person.name, person.role);
  const content = person.photo ? (
    // biome-ignore lint/performance/noImgElement: avatars are tiny, already-resized uploads
    <img src={person.photo} alt="" />
  ) : size === "xs" ? (
    label[0]
  ) : (
    label
  );
  if (!link) {
    return (
      <span
        className={cls}
        style={tint(person.color)}
        title={person.name}
        aria-hidden="true"
      >
        {content}
      </span>
    );
  }
  return (
    <Link
      href={profileHref(person.username)}
      className={cls}
      style={tint(person.color)}
      title={person.name}
      data-u={person.username}
      aria-label={person.name}
    >
      {content}
    </Link>
  );
}

export function SpaceIcon({
  category,
  size,
}: {
  category: Pick<CategoryRef, "color" | "icon">;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`sp-ic${size ? ` ${size}` : ""}`}
      style={tint(category.color)}
      aria-hidden="true"
    >
      <Icon name={asIcon(category.icon)} />
    </span>
  );
}

export function CatTag({ category }: { category: CategoryRef | null }) {
  if (!category) return null;
  return (
    <Link href={spaceHref(category.slug)} className="cat-tag">
      {category.name}
    </Link>
  );
}

export function TypeTag({
  d,
}: {
  d: Pick<DiscussionSummary, "type" | "solved">;
}) {
  if (d.type === "question")
    return d.solved ? (
      <span className="tag tag-ok">
        <Icon name="check" />
        Résolu
      </span>
    ) : (
      <span className="tag tag-q">Question</span>
    );
  if (d.type === "poll")
    return (
      <span className="tag tag-poll">
        <Icon name="chart" />
        Sondage
      </span>
    );
  return null;
}

export function PinTag() {
  return (
    <span className="tag tag-pin">
      <Icon name="pin" />
      Épinglé
    </span>
  );
}

/** Editorial indexing pill (staff view only). */
export function SeoPill({
  seo,
  feminine = true,
}: {
  seo?: SeoStatus;
  feminine?: boolean;
}) {
  if (!seo) return null;
  return (
    <span
      className={`tag ${seo.indexed ? "tag-idx" : "tag-noidx"}`}
      title={seo.reason}
    >
      <Icon name={seo.indexed ? "globe" : "eyeoff"} />
      {seo.indexed
        ? feminine
          ? "Indexée"
          : "Indexé"
        : feminine
          ? "Non indexée"
          : "Non indexé"}
    </span>
  );
}

export function RoleTags({
  person,
  withLevel = true,
}: {
  person: Person;
  withLevel?: boolean;
}) {
  if (person.role === "redaction")
    return (
      <span className="tag tag-redac">
        <Icon name="check" />
        Rédaction
      </span>
    );
  if (person.role === "moderator")
    return (
      <span className="tag tag-q">
        <Icon name="shield" />
        Modération
      </span>
    );
  return (
    <>
      {person.pro && (
        <span className="tag tag-pro">
          <Icon name="verified" />
          Expertise vérifiée
        </span>
      )}
      {person.subscriber && <span className="tag tag-sub">Abonné</span>}
      {withLevel && person.level && (
        <span className="tag tag-level">{person.level}</span>
      )}
    </>
  );
}

export const BADGES: Record<
  string,
  { name: string; description: string; icon: IconName }
> = {
  bienvenue: {
    name: "Bienvenue",
    description: "A rejoint la communauté",
    icon: "hand",
  },
  premier_sujet: {
    name: "Premier pas",
    description: "A lancé sa première discussion",
    icon: "pen",
  },
  premiere_reponse: {
    name: "Entraide",
    description: "A publié sa première réponse",
    icon: "msg",
  },
  apprecie: {
    name: "Apprécié",
    description: "A reçu son premier « Utile »",
    icon: "thumb",
  },
  populaire: {
    name: "Populaire",
    description: "A reçu 25 « Utile »",
    icon: "star",
  },
  solution: {
    name: "Bonne réponse",
    description: "Réponse choisie comme meilleure réponse",
    icon: "check",
  },
  sondeur: {
    name: "Sondeur",
    description: "A lancé un sondage",
    icon: "chart",
  },
  citoyen: {
    name: "Votre avis compte",
    description: "A voté à 3 sondages",
    icon: "vote",
  },
  assidu: {
    name: "Assidu",
    description: "7 jours de visite d'affilée",
    icon: "flame",
  },
  pilier: {
    name: "Pilier des échanges",
    description: "A publié 50 réponses",
    icon: "columns",
  },
};

export function BadgeIcon({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const badge = BADGES[code];
  if (!badge) return null;
  return (
    <span className={`bdg ${className}`.trim()} title={badge.name}>
      <Icon name={badge.icon} />
    </span>
  );
}

export function AvatarStack({
  people,
  size = "xs",
}: {
  people: AvatarPerson[];
  size?: "xs" | "sm";
}) {
  if (!people.length) return null;
  return (
    <span className="stack">
      {people.map((p) => (
        <Avatar key={p.username} person={p} size={size} />
      ))}
    </span>
  );
}

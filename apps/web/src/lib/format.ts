/** Formatting helpers shared by server and client components (French locale, as on the prototype). */

export const fmt = (n: number) => n.toLocaleString("fr-FR");

export const fmtK = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toFixed(1).replace(".", ",").replace(",0", "")} k`
    : String(n);

const minutesSince = (iso: string | null, now: number) =>
  iso ? Math.max(0, (now - new Date(iso).getTime()) / 60000) : 0;

/** "il y a 3 h", "hier", "il y a 4 j". */
export function ago(iso: string | null, now = Date.now()): string {
  const min = minutesSince(iso, now);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

/** "45 min", "3 h", "2 j" (compact list). */
export function shortAgo(iso: string | null, now = Date.now()): string {
  const min = minutesSince(iso, now);
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} j`;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
): string {
  return `${fmt(count)} ${count > 1 ? pluralForm : singular}`;
}

export function initials(name: string, role?: string): string {
  if (role === "redaction") return "R";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const readTime = (text: string) =>
  Math.max(1, Math.round(text.split(/\s+/).length / 200));

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "Date inconnue";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : dateFormatter.format(date);
}

/** "Sondage de la semaine : quel est…" -> "Quel est…" (the widget label already says it). */
export const cleanTitle = (title: string, prefix: string) => {
  const t = title.startsWith(prefix) ? title.slice(prefix.length) : title;
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Maps feed URLs (`/?onglet=recentes&page=2`, `/espaces/bourse?onglet=sans-reponse`)
 * to the Strapi list query. Pure functions: shared by pages, links and tests.
 */
import type { FeedTab } from "./strapi/types";

export interface FeedFilters {
  category: string | null;
  tab: FeedTab;
  page: number;
}

export const PAGE_SIZE = 12;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** URL value ↔ API tab. */
export const TAB_PARAM: Record<FeedTab, string> = {
  foryou: "pour-vous",
  hot: "tendances",
  new: "recentes",
  unanswered: "sans-reponse",
};
const PARAM_TAB = Object.fromEntries(
  Object.entries(TAB_PARAM).map(([k, v]) => [v, k]),
) as Record<string, FeedTab>;

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Default tab as on the prototype: "Pour vous" for members on the home page, "Tendances" otherwise. */
export const defaultTab = (
  logged: boolean,
  category: string | null,
): FeedTab => (logged && !category ? "foryou" : "hot");

/** Unknown or malformed values fall back to defaults instead of breaking the page. */
export function parseFeedFilters(
  params: RawParams,
  options: { category?: string | null; logged: boolean },
): FeedFilters {
  const category =
    options.category && SLUG_RE.test(options.category)
      ? options.category
      : null;
  let tab =
    PARAM_TAB[first(params.onglet) ?? ""] ??
    defaultTab(options.logged, category);
  // "Pour vous" only exists on the home page, for members.
  if (tab === "foryou" && (category || !options.logged)) tab = "hot";
  const page = Number(first(params.page));
  return {
    category,
    tab,
    page: Number.isInteger(page) && page > 0 && page <= 10_000 ? page : 1,
  };
}

/** Filters sent back by the browser to load the next feed page: anything off is refused. */
export function sanitizeFeedFilters(raw: {
  category?: unknown;
  tab?: unknown;
  page?: unknown;
}): FeedFilters | null {
  const category = raw.category ?? null;
  if (
    category !== null &&
    (typeof category !== "string" || !SLUG_RE.test(category))
  )
    return null;
  const tab = (Object.keys(TAB_PARAM) as FeedTab[]).find((t) => t === raw.tab);
  const page = raw.page;
  if (!tab || typeof page !== "number" || !Number.isInteger(page)) return null;
  if (page < 1 || page > 10_000) return null;
  return { category, tab, page };
}

/** Query string understood by `GET /api/discussions` (see apps/cms validation). */
export function toDiscussionApiQuery(filters: FeedFilters): URLSearchParams {
  const query = new URLSearchParams({
    tab: filters.tab,
    sort: "desc",
    page: String(filters.page),
    pageSize: String(PAGE_SIZE),
  });
  if (filters.category) query.set("category", filters.category);
  return query;
}

/** Builds a feed URL, omitting defaults so links stay short and canonical. */
export function feedHref(
  filters: Partial<FeedFilters>,
  logged: boolean,
): string {
  const base = filters.category
    ? `/espaces/${encodeURIComponent(filters.category)}`
    : "/";
  const query = new URLSearchParams();
  if (
    filters.tab &&
    filters.tab !== defaultTab(logged, filters.category ?? null)
  )
    query.set("onglet", TAB_PARAM[filters.tab]);
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

export const discussionHref = (slug: string) =>
  `/discussions/${encodeURIComponent(slug)}`;
export const postHref = (slug: string) =>
  `/billets/${encodeURIComponent(slug)}`;

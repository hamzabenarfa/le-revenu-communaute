import { type FieldErrors, StrapiError } from "@/lib/strapi/errors";
import type { Reward } from "@/lib/strapi/types";

/** Uniform, serializable result of a Server Action called from a client widget. */
export type ActionResult<T = null> =
  | { ok: true; data: T; reward?: Reward | null; message?: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: FieldErrors;
      needsLogin?: boolean;
    };

export const NEEDS_LOGIN: { ok: false; error: string; needsLogin: true } = {
  ok: false,
  error: "Connectez-vous pour continuer.",
  needsLogin: true,
};

/** Maps an API failure to a result; never claims a success the API did not confirm. */
export function toFailure(error: unknown): ActionResult<never> {
  if (!(error instanceof StrapiError)) throw error;
  if (error.status === 401)
    return {
      ok: false,
      needsLogin: true,
      error: "Votre session a expiré. Reconnectez-vous.",
    };
  if (error.status === 403)
    return { ok: false, error: "Cette action ne vous est pas autorisée." };
  const hasFields = Object.keys(error.fieldErrors).length > 0;
  return {
    ok: false,
    error: hasFields
      ? (Object.values(error.fieldErrors)[0] ?? error.message)
      : error.message,
    fieldErrors: error.fieldErrors,
  };
}

/** Server Action arguments come from the browser: accept only short strings. */
export const str = (value: unknown, max = 64): string | null =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= max &&
  // Ids end up in Strapi paths: never let "." / ".." or a slash walk the URL.
  !/^\.{1,2}$/.test(value) &&
  !value.includes("/")
    ? value
    : null;

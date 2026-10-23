import "server-only";
import { getSessionToken } from "../session";
import { type StrapiRequest, strapiFetch } from "./client";
import { StrapiError } from "./errors";

/**
 * Same as strapiFetch, but forwards the visitor's session (when any) so Strapi
 * can personalise the answer: "Utile" already given, my vote, follow state…
 * Never cached: the result is specific to one visitor.
 */
export async function viewerFetch<T>(
  path: string,
  init: Omit<StrapiRequest, "token"> = {},
): Promise<T> {
  const token = await getSessionToken();
  if (!token) return strapiFetch<T>(path, init);
  try {
    return await strapiFetch<T>(path, { ...init, token });
  } catch (error) {
    // An expired or forged session must not break public pages: read them as a visitor.
    if (error instanceof StrapiError && error.status === 401)
      return strapiFetch<T>(path, init);
    throw error;
  }
}

/** For writes: the caller has already checked that a session exists. */
export async function memberFetch<T>(
  token: string,
  path: string,
  init: Omit<StrapiRequest, "token"> = {},
): Promise<T> {
  return strapiFetch<T>(path, { ...init, token });
}

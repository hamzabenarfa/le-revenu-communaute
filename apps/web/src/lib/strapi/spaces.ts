import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSpaces } from "./community";
import { StrapiError } from "./errors";
import type { Space } from "./types";

type SpacesResult =
  | { ok: true; spaces: Space[] }
  | { ok: false; status: number; message: string };

/** Public and identical for everyone: the one read worth caching on the server (refreshed every few minutes). */
async function cachedSpaces(): Promise<SpacesResult> {
  "use cache";
  cacheTag("spaces");
  try {
    const spaces = await getSpaces();
    cacheLife("minutes");
    return { ok: true, spaces };
  } catch (error) {
    // An error thrown in a "use cache" scope fails `next build` when Strapi is down
    // (e.g. a Render cold start). Return it instead, as a short-lived entry: Next keeps
    // it out of the prerender and retries on the next request.
    cacheLife("seconds");
    return error instanceof StrapiError
      ? { ok: false, status: error.status, message: error.message }
      : {
          ok: false,
          status: 503,
          message: "Les espaces sont momentanément indisponibles.",
        };
  }
}

export async function listSpaces(): Promise<Space[]> {
  const result = await cachedSpaces();
  if (!result.ok) throw new StrapiError(result.status, result.message);
  return result.spaces;
}

export async function findSpace(
  slug: string | null | undefined,
): Promise<Space | null> {
  if (!slug) return null;
  return (await listSpaces()).find((s) => s.slug === slug) ?? null;
}

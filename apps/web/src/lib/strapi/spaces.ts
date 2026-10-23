import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSpaces } from "./community";
import { StrapiError } from "./errors";
import type { Space } from "./types";

/** Public and identical for everyone: the one read worth caching on the server (refreshed every few minutes). */
async function cachedSpaces(): Promise<Space[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("spaces");
  return getSpaces();
}

export async function listSpaces(): Promise<Space[]> {
  try {
    return await cachedSpaces();
  } catch (error) {
    // Errors leave a "use cache" scope serialized, without their class: restore a StrapiError.
    if (error instanceof StrapiError) throw error;
    throw new StrapiError(
      503,
      error instanceof Error && error.message
        ? error.message
        : "Les espaces sont momentanément indisponibles.",
    );
  }
}

export async function findSpace(
  slug: string | null | undefined,
): Promise<Space | null> {
  if (!slug) return null;
  return (await listSpaces()).find((s) => s.slug === slug) ?? null;
}

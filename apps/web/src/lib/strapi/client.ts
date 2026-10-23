import "server-only";
import { StrapiError, toStrapiError } from "./errors";

const DEFAULT_TIMEOUT_MS = 8000;

function baseUrl(): string {
  const url = process.env.STRAPI_URL;
  if (!url) {
    throw new Error(
      "STRAPI_URL is not set. Copy apps/web/.env.example to apps/web/.env.local.",
    );
  }
  return url.replace(/\/+$/, "");
}

export interface StrapiRequest {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: URLSearchParams;
  body?: unknown;
  /** User JWT. Only ever read from the httpOnly session cookie on the server. */
  token?: string;
  timeoutMs?: number;
}

/**
 * Single entry point to the Strapi REST API. Runs on the server only, so the
 * Strapi URL and user tokens never reach the browser bundle.
 */
export async function strapiFetch<T>(
  path: string,
  {
    method = "GET",
    query,
    body,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: StrapiRequest = {},
): Promise<T> {
  const url = `${baseUrl()}/api${path}${query?.size ? `?${query}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart)
    headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : multipart
            ? body
            : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const timedOut =
      cause instanceof DOMException && cause.name === "TimeoutError";
    throw new StrapiError(
      503,
      timedOut
        ? "Le service de la communauté met trop de temps à répondre."
        : "Le service de la communauté est momentanément indisponible.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toStrapiError(response.status, payload);
  if (payload === null)
    throw new StrapiError(502, "Réponse invalide du service de la communauté.");
  return payload as T;
}

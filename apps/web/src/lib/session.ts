import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getMe } from "./strapi/community";
import { StrapiError } from "./strapi/errors";
import type { Me } from "./strapi/types";

const COOKIE = "lr_session";
const MAX_AGE = 60 * 60 * 24 * 7;

/** The Strapi JWT lives only in this httpOnly cookie: never in JS, URLs or logs. */
export async function setSessionToken(jwt: string) {
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/**
 * Resolves the signed-in member by asking Strapi, so an expired or forged
 * cookie simply reads as "logged out". Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<Me | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await getMe(token);
  } catch (error) {
    if (error instanceof StrapiError && error.isAuthError) return null;
    throw error;
  }
});

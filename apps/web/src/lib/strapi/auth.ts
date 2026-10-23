import "server-only";
import { strapiFetch } from "./client";

export async function loginWithPassword(identifier: string, password: string) {
  const { jwt } = await strapiFetch<{ jwt: string }>("/auth/local", {
    method: "POST",
    body: { identifier, password },
  });
  return jwt;
}

/** Sign-up with e-mail and password; the pseudo and interests are chosen right after (onboarding). */
export async function register(email: string, password: string) {
  const base =
    email
      .split("@")[0]
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 16) || "membre";
  const username = `${base}_${Math.random().toString(36).slice(2, 7)}`;
  const { jwt } = await strapiFetch<{ jwt: string }>("/auth/local/register", {
    method: "POST",
    body: { username, email, password },
  });
  return jwt;
}

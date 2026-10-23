"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { readField, safeRedirectPath } from "@/lib/form-state";
import { clearSession, getCurrentUser, setSessionToken } from "@/lib/session";
import { loginWithPassword, register } from "@/lib/strapi/auth";
import { StrapiError } from "@/lib/strapi/errors";
import type { Me } from "@/lib/strapi/types";
import type { ActionResult } from "./result";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Login used by the modal: returns the member so the client can continue (e.g. onboarding). */
export async function signIn(formData: FormData): Promise<ActionResult<Me>> {
  const identifier = readField(formData, "identifier").trim();
  const password = readField(formData, "password");
  if (!identifier || !password) {
    return {
      ok: false,
      error: "Saisissez votre adresse e-mail et votre mot de passe.",
      fieldErrors: {
        ...(identifier
          ? {}
          : { identifier: "Saisissez votre adresse e-mail." }),
        ...(password ? {} : { password: "Saisissez votre mot de passe." }),
      },
    };
  }
  try {
    await setSessionToken(await loginWithPassword(identifier, password));
  } catch (error) {
    if (error instanceof StrapiError && error.status === 400)
      return { ok: false, error: "Adresse e-mail ou mot de passe incorrect." };
    if (error instanceof StrapiError && error.status === 429)
      return {
        ok: false,
        error: "Trop de tentatives. Réessayez dans une minute.",
      };
    return {
      ok: false,
      error:
        error instanceof StrapiError
          ? error.message
          : "La connexion a échoué. Réessayez.",
    };
  }
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "La connexion a échoué. Réessayez." };
  refresh();
  return { ok: true, data: me };
}

export async function signUp(formData: FormData): Promise<ActionResult<Me>> {
  const email = readField(formData, "identifier").trim().toLowerCase();
  const password = readField(formData, "password");
  const fieldErrors: Record<string, string> = {};
  if (!EMAIL_RE.test(email))
    fieldErrors.identifier = "Saisissez une adresse e-mail valide.";
  if (password.length < 8)
    fieldErrors.password =
      "Choisissez un mot de passe d’au moins 8 caractères.";
  if (Object.keys(fieldErrors).length)
    return { ok: false, error: Object.values(fieldErrors)[0], fieldErrors };
  try {
    await setSessionToken(await register(email, password));
  } catch (error) {
    if (error instanceof StrapiError && error.status === 400)
      return {
        ok: false,
        error: /already taken/i.test(error.message)
          ? "Un compte existe déjà avec cette adresse."
          : error.message,
      };
    if (error instanceof StrapiError && error.status === 429)
      return {
        ok: false,
        error: "Trop de tentatives. Réessayez dans une minute.",
      };
    throw error;
  }
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "L’inscription a échoué. Réessayez." };
  return { ok: true, data: me };
}

/** Login page (works without JavaScript): redirects after success. */
export async function loginWithForm(
  _prev: ActionResult<Me> | null,
  formData: FormData,
): Promise<ActionResult<Me>> {
  const result = await signIn(formData);
  if (!result.ok) return result;
  redirect(safeRedirectPath(readField(formData, "next")));
}

export async function logout() {
  await clearSession();
  redirect("/");
}

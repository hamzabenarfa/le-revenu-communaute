/** Helpers for Server Actions that read HTML form posts. */

export const readField = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/**
 * Only same-site relative paths are accepted as post-login destinations.
 * The value is resolved like a browser would (which strips tabs/newlines and
 * treats "\\" as "/"), and rejected if it would leave the site.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value || !value.startsWith("/")) return fallback;
  const base = "http://same-site.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

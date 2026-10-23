/** Field path -> first error message, as returned by Strapi's ValidationError details. */
export type FieldErrors = Partial<Record<string, string>>;

/** A normalized failure from the Strapi API (or from reaching it). */
export class StrapiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "StrapiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

interface StrapiErrorBody {
  error?: {
    status?: number;
    message?: string;
    details?: { errors?: Array<{ path?: unknown; message?: unknown }> };
  };
}

/** Converts a Strapi v5 error payload (`{ data: null, error: {...} }`) into a StrapiError. */
export function toStrapiError(status: number, body: unknown): StrapiError {
  const error = (body as StrapiErrorBody | null)?.error;
  const fieldErrors: FieldErrors = {};
  for (const issue of error?.details?.errors ?? []) {
    const field = Array.isArray(issue.path) ? issue.path.join(".") : null;
    if (field && typeof issue.message === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  const message =
    typeof error?.message === "string" && error.message
      ? error.message
      : `Erreur ${status}`;
  return new StrapiError(status, message, fieldErrors);
}

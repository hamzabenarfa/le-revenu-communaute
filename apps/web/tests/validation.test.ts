import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/form-state";
import { toStrapiError } from "@/lib/strapi/errors";

describe("toStrapiError", () => {
  it("maps Strapi v5 validation details to per-field messages", () => {
    const error = toStrapiError(400, {
      data: null,
      error: {
        status: 400,
        name: "ValidationError",
        message: "2 erreurs de validation",
        details: {
          errors: [
            { path: ["title"], message: "Trop court" },
            { path: ["author"], message: "Interdit" },
          ],
        },
      },
    });
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({
      title: "Trop court",
      author: "Interdit",
    });
  });

  it("survives a non-JSON error body", () => {
    expect(toStrapiError(502, null).message).toBe("Erreur 502");
    expect(toStrapiError(403, null).isAuthError).toBe(true);
  });
});

describe("safeRedirectPath", () => {
  it("only allows same-site paths after login", () => {
    expect(safeRedirectPath("/publier")).toBe("/publier");
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\t/evil.example")).toBe("/");
    expect(safeRedirectPath("/\n/evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("/discussions/x?a=1#r")).toBe(
      "/discussions/x?a=1#r",
    );
    expect(safeRedirectPath(undefined)).toBe("/");
  });
});

import { describe, expect, it } from "vitest";
import { isTrusted, untrustedHosts } from "@/lib/links";

describe("trusted sources", () => {
  it("accepts lerevenu.com, public sites and their subdomains", () => {
    expect(isTrusted("lerevenu.com")).toBe(true);
    expect(isTrusted("www.impots.gouv.fr")).toBe(true);
    expect(isTrusted("amf-france.org")).toBe(true);
  });

  it("rejects look-alikes", () => {
    expect(isTrusted("evil-lerevenu.com")).toBe(false);
    expect(isTrusted("lerevenu.com.evil.io")).toBe(false);
  });

  it("lists the untrusted hosts of a message", () => {
    expect(
      untrustedHosts(
        "voir https://www.service-public.fr/x et pub-crypto.com, puis pub-crypto.com",
      ),
    ).toEqual(["pub-crypto.com"]);
  });
});

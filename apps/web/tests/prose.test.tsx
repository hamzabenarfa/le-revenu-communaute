import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Prose } from "@/components/prose";

describe("Prose", () => {
  it("renders paragraphs, **bold** and « - » lists", () => {
    const { container } = render(
      <Prose
        text={
          "**1. La régularité bat le talent.**\n\nCe qui n'a pas marché :\n- trop de lignes\n- regarder tous les jours"
        }
      />,
    );
    expect(container.querySelector("strong")?.textContent).toBe(
      "1. La régularité bat le talent.",
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["trop de lignes", "regarder tous les jours"],
    );
  });

  it("makes trusted links clickable with ugc/nofollow, and holds the others for moderation", () => {
    render(<Prose text="Voir service-public.fr et www.pub-crypto.com" />);
    const link = screen.getByRole("link", { name: "service-public.fr" });
    expect(link).toHaveAttribute(
      "rel",
      expect.stringContaining("ugc nofollow"),
    );
    expect(link).toHaveAttribute("href", "https://service-public.fr/");
    expect(screen.queryByRole("link", { name: /pub-crypto/ })).toBeNull();
    expect(
      screen.getByText(/lien en attente de validation/),
    ).toBeInTheDocument();
  });

  it("links @mentions to member profiles", () => {
    render(<Prose text="Très bonne réponse de @Vincent_ETF." />);
    expect(screen.getByRole("link", { name: "@Vincent_ETF" })).toHaveAttribute(
      "href",
      "/membres/Vincent_ETF",
    );
  });

  it("never interprets member text as HTML", () => {
    const { container } = render(
      <Prose
        text={'<script>alert(1)</script><a href="javascript:alert(1)">x</a>'}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a[href^='javascript']")).toBeNull();
  });
});

describe("Prose link policy", () => {
  it("does not let a backslash smuggle an untrusted host behind a trusted name", () => {
    render(<Prose text={"Lien : https://evil.xyz\\.lerevenu.com/a"} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByText(/lien en attente de validation/),
    ).toBeInTheDocument();
  });
});

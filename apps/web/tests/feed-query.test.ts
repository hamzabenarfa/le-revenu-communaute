import { describe, expect, it } from "vitest";
import {
  discussionHref,
  feedHref,
  parseFeedFilters,
  toDiscussionApiQuery,
} from "@/lib/discussion-query";

describe("parseFeedFilters", () => {
  it("defaults to « Pour vous » for members on the home page and « Tendances » otherwise", () => {
    expect(parseFeedFilters({}, { logged: true })).toEqual({
      category: null,
      tab: "foryou",
      page: 1,
    });
    expect(parseFeedFilters({}, { logged: false })).toEqual({
      category: null,
      tab: "hot",
      page: 1,
    });
    expect(parseFeedFilters({}, { logged: true, category: "bourse" })).toEqual({
      category: "bourse",
      tab: "hot",
      page: 1,
    });
  });

  it("reads the French tab names and the page", () => {
    expect(
      parseFeedFilters(
        { onglet: "sans-reponse", page: "3" },
        { logged: false },
      ),
    ).toEqual({ category: null, tab: "unanswered", page: 3 });
    expect(parseFeedFilters({ onglet: "recentes" }, { logged: true }).tab).toBe(
      "new",
    );
  });

  it("never offers « Pour vous » to visitors or inside a space", () => {
    expect(
      parseFeedFilters({ onglet: "pour-vous" }, { logged: false }).tab,
    ).toBe("hot");
    expect(
      parseFeedFilters(
        { onglet: "pour-vous" },
        { logged: true, category: "bourse" },
      ).tab,
    ).toBe("hot");
  });

  it("ignores malformed values instead of forwarding them to the API", () => {
    expect(
      parseFeedFilters(
        { onglet: "<script>", page: "-2" },
        { logged: false, category: "../admin" },
      ),
    ).toEqual({ category: null, tab: "hot", page: 1 });
  });
});

describe("toDiscussionApiQuery", () => {
  it("asks Strapi to filter, rank and paginate on the server", () => {
    expect(
      Object.fromEntries(
        toDiscussionApiQuery({ category: "bourse", tab: "new", page: 2 }),
      ),
    ).toEqual({
      tab: "new",
      sort: "desc",
      page: "2",
      pageSize: "12",
      category: "bourse",
    });
    expect(
      toDiscussionApiQuery({ category: null, tab: "hot", page: 1 }).has(
        "category",
      ),
    ).toBe(false);
  });
});

describe("links", () => {
  it("keeps feed URLs canonical by dropping defaults", () => {
    expect(feedHref({ tab: "foryou" }, true)).toBe("/");
    expect(feedHref({ tab: "hot" }, false)).toBe("/");
    expect(feedHref({ tab: "new", page: 2 }, false)).toBe(
      "/?onglet=recentes&page=2",
    );
    expect(
      feedHref({ category: "assurance-vie", tab: "unanswered" }, true),
    ).toBe("/espaces/assurance-vie?onglet=sans-reponse");
  });

  it("encodes slugs", () => {
    expect(discussionHref("a b")).toBe("/discussions/a%20b");
  });
});

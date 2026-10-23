import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopicCard, TopicRow } from "@/components/feed";
import { discussion, person } from "./fixtures";

describe("TopicCard", () => {
  it("shows title (linked to the detail page), author, category, reply count and publication date", () => {
    const { container } = render(<TopicCard d={discussion()} />);
    const card = within(screen.getByRole("article"));
    expect(
      card.getByRole("link", {
        name: "Ouvrir un PEA avec 5 000 € : par où commencer ?",
      }),
    ).toHaveAttribute("href", "/discussions/ouvrir-un-pea");
    expect(card.getByText("Thomas")).toBeInTheDocument();
    expect(
      card.getByRole("link", { name: "Bourse & actions" }),
    ).toHaveAttribute("href", "/espaces/bourse");
    expect(card.getByText("Question")).toBeInTheDocument();
    expect(container.querySelector(".tcount b")?.textContent).toBe("3");
    expect(card.getByText("réponses")).toBeInTheDocument();
    expect(card.getByText(/il y a 2 j/)).toBeInTheDocument();
    expect(card.getByText("1 210")).toBeInTheDocument();
  });

  it("marks unanswered, solved and poll discussions like the prototype", () => {
    const { container, rerender } = render(
      <TopicCard d={discussion({ replyCount: 0, isNew: true })} />,
    );
    expect(container.querySelector(".tcount.zero")).not.toBeNull();
    expect(screen.getByText("Nouveau")).toBeInTheDocument();

    rerender(<TopicCard d={discussion({ solved: true })} />);
    expect(container.querySelector(".tcount.solved")).not.toBeNull();
    expect(screen.getByText("Résolu")).toBeInTheDocument();

    rerender(<TopicCard d={discussion({ type: "poll", pollVotes: 814 })} />);
    expect(container.querySelector(".tcount.poll")?.textContent).toContain(
      "814",
    );
    expect(screen.getByText("Sondage")).toBeInTheDocument();
  });

  it("labels editorial posts and pinned discussions", () => {
    render(
      <TopicCard
        d={discussion({
          pinned: true,
          author: person({ role: "redaction", name: "La rédaction du Revenu" }),
        })}
      />,
    );
    expect(screen.getByText("Rédaction")).toBeInTheDocument();
    expect(screen.getByText("Épinglé")).toBeInTheDocument();
  });

  it("renders member content as text, never as HTML", () => {
    const { container } = render(
      <TopicCard
        d={discussion({
          title: "<img src=x onerror=alert(1)> titre piégé",
          excerpt: "<script>alert(1)</script>",
        })}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(screen.getByText(/titre piégé/)).toBeInTheDocument();
  });

  it("survives a deleted author or category", () => {
    render(<TopicCard d={discussion({ author: null, category: null })} />);
    expect(screen.getByText("Membre supprimé")).toBeInTheDocument();
  });
});

describe("TopicRow (compact view)", () => {
  it("shows the reply count, views and last activity in columns", () => {
    const { container } = render(<TopicRow d={discussion({ views: 2140 })} />);
    expect(screen.getByRole("link", { name: /Ouvrir un PEA/ })).toHaveAttribute(
      "href",
      "/discussions/ouvrir-un-pea",
    );
    const nums = [...container.querySelectorAll(".c-num")].map(
      (n) => n.textContent,
    );
    expect(nums).toEqual(["3", "2.1 k".replace(".", ","), "1 h"]);
  });
});

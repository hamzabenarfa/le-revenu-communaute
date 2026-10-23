import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me, Space } from "@/lib/strapi/types";

const publishDiscussion = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions/community", () => ({
  publishDiscussion: (...args: unknown[]) => publishDiscussion(...args),
  loadSimilar: async () => ({ ok: true, data: [] }),
  loadMentions: async () => ({ ok: true, data: [] }),
  publishPost: vi.fn(),
  reportMessage: vi.fn(),
  saveProfile: vi.fn(),
  savePhoto: vi.fn(),
}));
vi.mock("@/app/actions/auth", () => ({ signIn: vi.fn(), signUp: vi.fn() }));

const { AppProvider, useApp } = await import("@/components/app/app-context");
const { ModalHost } = await import("@/components/app/modals");

const spaces: Space[] = [
  {
    documentId: "c1",
    name: "Bourse & actions",
    slug: "bourse",
    color: "#007aff",
    icon: "candles",
    description: null,
    rubrique: null,
    discussionCount: 0,
    replyCount: 0,
    activeMembers: 0,
  },
];
const me = {
  username: "Camille_B",
  name: "Camille",
  color: "#d30f45",
  photo: null,
  role: "member",
  subscriber: false,
  pro: null,
  points: 10,
  monthPoints: 0,
  level: {
    index: 0,
    name: "Nouveau venu",
    min: 0,
    next: 25,
    nextName: "Membre",
  },
  badges: [],
  stats: {},
  email: "c@test.local",
  bio: "",
  onboarded: true,
  streak: 1,
  interests: [],
  interestIds: [],
  staff: false,
  unread: 0,
} as unknown as Me;

function Opener() {
  const { openComposer } = useApp();
  return (
    <button type="button" onClick={() => openComposer()}>
      ouvrir
    </button>
  );
}

function setup() {
  render(
    <AppProvider initialMe={me} spaces={spaces}>
      <Opener />
      <ModalHost />
    </AppProvider>,
  );
}

beforeEach(() => {
  publishDiscussion.mockReset();
  sessionStorage.clear();
});

describe("composer", () => {
  it("puts the focus in the form, not on the close button", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("ouvrir"));
    await new Promise((r) => setTimeout(r, 60));
    expect(document.activeElement).not.toBe(
      screen.getByRole("button", { name: "Fermer" }),
    );
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true,
    );
  });

  it("explains what is missing and does not call the server", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("ouvrir"));
    await user.type(screen.getByLabelText("Titre"), "Court");
    await user.click(screen.getByRole("button", { name: "Publier" }));

    expect(screen.getByText(/10 caractères minimum/)).toBeInTheDocument();
    expect(
      screen.getByText("Choisissez l'espace où publier."),
    ).toBeInTheDocument();
    expect(screen.getByText(/le contenu est obligatoire/)).toBeInTheDocument();
    expect(publishDiscussion).not.toHaveBeenCalled();
  });

  it("offers question, discussion and poll; a poll needs two answers", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("ouvrir"));
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: /Créer un sondage/ }));
    await user.type(
      screen.getByLabelText("Titre"),
      "Combien de lignes dans votre PEA ?",
    );
    await user.selectOptions(screen.getByLabelText("Espace"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier" }));
    expect(
      screen.getByText("Un sondage a besoin d'au moins deux réponses."),
    ).toBeInTheDocument();
    expect(publishDiscussion).not.toHaveBeenCalled();
  });

  it("sends a valid question without any author field", async () => {
    publishDiscussion.mockResolvedValue({
      ok: true,
      data: { slug: "faut-il-ouvrir-un-per" },
      reward: null,
    });
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("ouvrir"));
    await user.type(
      screen.getByLabelText("Titre"),
      "Faut-il ouvrir un PER à 45 ans ?",
    );
    await user.selectOptions(screen.getByLabelText("Espace"), "c1");
    await user.type(
      screen.getByLabelText(/Détails/),
      "Je suis salariée et imposée à 30 %.",
    );
    await user.click(screen.getByRole("button", { name: "Publier" }));

    expect(publishDiscussion).toHaveBeenCalledWith({
      title: "Faut-il ouvrir un PER à 45 ans ?",
      content: "Je suis salariée et imposée à 30 %.",
      type: "question",
      category: "c1",
    });
    expect(publishDiscussion.mock.calls[0][0]).not.toHaveProperty("author");
  });
});

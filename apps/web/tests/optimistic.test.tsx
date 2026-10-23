import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me } from "@/lib/strapi/types";

const toggleUseful = vi.fn();
const publishReply = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions/community", () => ({
  toggleUseful: (...args: unknown[]) => toggleUseful(...args),
  publishReply: (...args: unknown[]) => publishReply(...args),
  loadMentions: async () => ({ ok: true, data: [] }),
}));

const { AppProvider } = await import("@/components/app/app-context");
const { ReplyBox, UsefulButton } = await import(
  "@/components/discussion-actions"
);

const me = {
  username: "Camille_B",
  name: "Camille",
  color: "#d30f45",
  photo: null,
  role: "member",
  pro: null,
  onboarded: true,
  staff: false,
  level: {
    index: 1,
    name: "Membre",
    min: 25,
    next: 100,
    nextName: "Contributeur",
  },
} as unknown as Me;

/** Resolves when the test says so: the UI is checked while the action is in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function setup(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AppProvider initialMe={me} spaces={[]}>
        {ui}
      </AppProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  toggleUseful.mockReset();
  publishReply.mockReset();
  sessionStorage.clear();
});

describe("optimistic « Utile »", () => {
  it("counts the click before the server answers, then keeps its result", async () => {
    const answer = deferred<unknown>();
    toggleUseful.mockReturnValue(answer.promise);
    setup(
      <UsefulButton
        targetType="reply"
        targetId="r1"
        liked={false}
        count={4}
        mine={false}
      />,
    );
    const button = screen.getByRole("button", { name: /Utile/ });
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("5");

    answer.resolve({ ok: true, data: { liked: true, count: 7 } });
    await waitFor(() => expect(button).toHaveTextContent("7"));
    expect(toggleUseful).toHaveBeenCalledWith("reply", "r1");
  });

  it("rolls back and explains when the server refuses", async () => {
    toggleUseful.mockResolvedValue({
      ok: false,
      error: "Cette action ne vous est pas autorisée.",
    });
    setup(
      <UsefulButton
        targetType="reply"
        targetId="r1"
        liked={false}
        count={4}
        mine={false}
      />,
    );
    const button = screen.getByRole("button", { name: /Utile/ });
    await userEvent.click(button);
    expect(
      await screen.findByText("Cette action ne vous est pas autorisée."),
    ).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("4");
  });
});

describe("optimistic reply", () => {
  const box = (
    <ReplyBox
      targetId="d1"
      label="Votre réponse"
      placeholder="Votre avis…"
      context={[]}
    />
  );

  it("shows the reply at once, without waiting for the page refresh", async () => {
    const answer = deferred<unknown>();
    publishReply.mockReturnValue(answer.promise);
    setup(box);
    const field = screen.getByLabelText("Votre réponse");
    await userEvent.type(field, "Un PEA bancaire suffit pour débuter.");
    await userEvent.click(
      screen.getByRole("button", { name: "Publier ma réponse" }),
    );

    expect(
      screen.getByText("Un PEA bancaire suffit pour débuter."),
    ).toBeInTheDocument();
    expect(screen.getByText(/en cours\s+d'envoi/)).toBeInTheDocument();
    expect(field).toHaveValue("");

    answer.resolve({ ok: true, data: { documentId: "r9", mentioned: [] } });
    await waitFor(() =>
      expect(screen.queryByText(/en cours\s+d'envoi/)).not.toBeInTheDocument(),
    );
    expect(publishReply).toHaveBeenCalledWith(
      "d1",
      "Un PEA bancaire suffit pour débuter.",
    );
  });

  it("gives the text back when publishing fails", async () => {
    publishReply.mockResolvedValue({
      ok: false,
      error: "Votre réponse est trop courte.",
    });
    setup(box);
    const field = screen.getByLabelText("Votre réponse");
    await userEvent.type(field, "Merci !");
    await userEvent.click(
      screen.getByRole("button", { name: "Publier ma réponse" }),
    );
    expect(
      await screen.findByText("Votre réponse est trop courte."),
    ).toBeInTheDocument();
    expect(field).toHaveValue("Merci !");
    expect(screen.queryByText(/en cours\s+d'envoi/)).not.toBeInTheDocument();
  });
});

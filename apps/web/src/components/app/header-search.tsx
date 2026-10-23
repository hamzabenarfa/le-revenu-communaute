"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "../icon";

/** Header search: submits to /recherche (also works as a plain GET form without JavaScript). */
export function HeaderSearch() {
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";
  return (
    <form
      className="search"
      action="/recherche"
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(
          new FormData(e.currentTarget).get("q") ?? "",
        ).trim();
        router.push(
          value ? `/recherche?q=${encodeURIComponent(value)}` : "/recherche",
        );
      }}
    >
      <Icon name="search" />
      <input
        name="q"
        placeholder="Rechercher une discussion, un sujet…"
        defaultValue={q}
        autoComplete="off"
        aria-label="Rechercher"
      />
    </form>
  );
}

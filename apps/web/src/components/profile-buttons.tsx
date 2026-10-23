"use client";

import { useEffect } from "react";
import { useApp } from "./app/app-context";
import { Icon } from "./icon";

export function PhotoEditButton() {
  const { openPhoto } = useApp();
  return (
    <button
      type="button"
      className="av-edit"
      aria-label="Changer la photo de profil"
      title="Changer la photo"
      onClick={openPhoto}
    >
      <Icon name="camera" />
    </button>
  );
}

export function EditProfileButton() {
  const { openOnboarding } = useApp();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => openOnboarding(true)}
    >
      Modifier le profil
    </button>
  );
}

/** Opens the composer on arrival (/publier deep link); the button reopens it after closing. */
export function OpenComposerOnMount({ category }: { category?: string }) {
  const { openComposer } = useApp();
  // biome-ignore lint/correctness/useExhaustiveDependencies: open once, on arrival
  useEffect(() => openComposer({ category }), []);
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => openComposer({ category })}
    >
      <Icon name="plus" />
      Nouvelle publication
    </button>
  );
}

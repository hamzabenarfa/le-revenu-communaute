"use client";

import { Icon } from "@/components/icon";

/** Last-resort boundary: no stack trace or internal detail reaches the visitor. */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="layout no-right">
      <nav className="side" aria-hidden="true" />
      <main className="main" id="contenu">
        <div className="card empty" role="alert">
          <h3>Une erreur est survenue</h3>
          <p>
            La page n&apos;a pas pu s&apos;afficher. Réessayez dans un instant.
          </p>
          <button type="button" className="btn btn-secondary" onClick={reset}>
            <Icon name="refresh" />
            Réessayer
          </button>
        </div>
      </main>
    </div>
  );
}

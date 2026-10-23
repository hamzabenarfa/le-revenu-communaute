"use client";

/**
 * Replaces the root layout when it fails: no global CSS, fonts or shell here,
 * so the page carries its own minimal inline styles.
 */
export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          color: "#111111",
          background: "#ffffff",
        }}
      >
        <title>Erreur · Communauté Le Revenu</title>
        <main role="alert" style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>
            Une erreur est survenue
          </h1>
          <p style={{ margin: "0 0 20px", color: "#555555" }}>
            La communauté n&apos;a pas pu s&apos;afficher. Réessayez dans un
            instant.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              font: "inherit",
              fontWeight: 600,
              padding: "10px 20px",
              border: 0,
              borderRadius: 4,
              background: "#eb0f0f",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}

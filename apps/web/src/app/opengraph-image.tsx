import { ImageResponse } from "next/og";

export const alt =
  "Communauté Le Revenu : les lecteurs du Revenu échangent sur l'argent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card, generated at build time; pages without their own image inherit it. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#ffffff",
        borderTop: "24px solid #eb0f0f",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#eb0f0f",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          R
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#111111" }}>
          Le Revenu · Communauté
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#111111",
            lineHeight: 1.1,
          }}
        >
          La communauté des lecteurs du Revenu
        </div>
        <div style={{ fontSize: 32, color: "#555555" }}>
          Bourse, épargne, impôts, retraite, transmission.
        </div>
      </div>
    </div>,
    size,
  );
}

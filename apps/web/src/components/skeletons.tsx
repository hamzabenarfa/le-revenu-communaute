/** Loading placeholders in the prototype's surfaces (no spinner over the whole page). */
export function FeedSkeleton() {
  return (
    <output
      className="feed"
      aria-label="Chargement des discussions"
      style={{ display: "flex" }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="tcard" aria-hidden="true">
          <div
            className="tcount"
            style={{ background: "var(--fill)", borderColor: "transparent" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                height: 12,
                width: 120,
                borderRadius: 6,
                background: "var(--fill)",
              }}
            />
            <span
              style={{
                height: 18,
                width: "75%",
                borderRadius: 6,
                background: "var(--fill-2)",
              }}
            />
            <span
              style={{
                height: 12,
                width: "100%",
                borderRadius: 6,
                background: "var(--fill)",
              }}
            />
          </div>
        </div>
      ))}
    </output>
  );
}

export function RailSkeleton() {
  return (
    <div
      className="card"
      style={{ height: 220, background: "var(--surface)" }}
      aria-hidden="true"
    />
  );
}

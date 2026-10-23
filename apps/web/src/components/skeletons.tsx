import type { CSSProperties } from "react";

/** Loading placeholders in the prototype's surfaces (no spinner over the whole page). */

function Bone({
  w,
  h = 12,
  round = false,
  style,
}: {
  w: number | string;
  h?: number;
  round?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`sk${round ? " sk-round" : ""}`}
      style={{ width: w, height: h, ...style }}
    />
  );
}

// Varied widths so the list reads as distinct discussions, not a stamped pattern.
const TITLES = ["78%", "64%", "86%", "58%"];
const EXCERPTS = ["92%", "84%", "96%", "70%"];

/** Mirrors `TopicCard`: count box, tags, title, two-line excerpt, byline and stats. */
function CardBone({ i }: { i: number }) {
  return (
    <div className="tcard sk-card">
      <span className="sk sk-count" />
      <div className="sk-col">
        <span className="sk-row">
          <Bone w={84} h={18} style={{ borderRadius: 999 }} />
          <Bone w={62} h={18} style={{ borderRadius: 999 }} />
        </span>
        <Bone w={TITLES[i % 4] ?? "70%"} h={18} style={{ marginTop: 2 }} />
        <Bone w={EXCERPTS[i % 4] ?? "90%"} />
        <Bone w="48%" />
        <span className="sk-row sk-foot">
          <Bone w={20} h={20} round />
          <Bone w={110} />
          <span style={{ flex: 1 }} />
          <Bone w={44} />
          <Bone w={44} />
        </span>
      </div>
    </div>
  );
}

/** Mirrors `TopicRow` for the compact view. */
function RowBone({ i }: { i: number }) {
  return (
    <div className="trow sk-card">
      <span className="tt">
        <Bone w={28} h={28} style={{ flex: "none", borderRadius: 8 }} />
        <span className="sk-col" style={{ flex: 1 }}>
          <Bone w={TITLES[i % 4] ?? "70%"} h={14} />
          <Bone w={140} h={10} />
        </span>
      </span>
      <span className="c-num">
        <Bone w={22} />
      </span>
      <span className="c-num c-views">
        <Bone w={30} />
      </span>
      <span className="c-num">
        <Bone w={26} />
      </span>
    </div>
  );
}

export function FeedSkeleton({
  count = 4,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <output
      className={`feed${compact ? " feed-compact" : ""}`}
      aria-label="Chargement des discussions"
      aria-busy="true"
      style={{ display: "flex" }}
    >
      {items.map((i) =>
        compact ? <RowBone key={i} i={i} /> : <CardBone key={i} i={i} />,
      )}
    </output>
  );
}

/** Right rail: a progress/join card, then a list widget. */
export function RailSkeleton() {
  return (
    <div className="sk-col" style={{ gap: 16 }} aria-hidden="true">
      <div className="card sk-col">
        <Bone w="45%" h={12} />
        <Bone w="85%" h={18} />
        <Bone w="100%" />
        <Bone w="70%" />
        <Bone w={140} h={34} style={{ marginTop: 6, borderRadius: 999 }} />
      </div>
      <div className="card sk-col" style={{ gap: 14 }}>
        <Bone w="40%" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="sk-row">
            <Bone w={28} h={28} round />
            <span className="sk-col" style={{ flex: 1, gap: 6 }}>
              <Bone w={TITLES[i] ?? "70%"} />
              <Bone w="40%" h={10} />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

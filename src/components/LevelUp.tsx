"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/client/store";
import { rankFor } from "@/lib/client/progress";
import LevelRing from "./LevelRing";

const CONFETTI = ["#8B7CFF", "#5EEAD4", "#FBBF24", "#FF7A59", "#F472B6", "#60A5FA"];

export default function LevelUp() {
  const { levelUp, dismissLevelUp } = useStore();

  useEffect(() => {
    if (levelUp === null) return;
    const t = setTimeout(dismissLevelUp, 6000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissLevelUp();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [levelUp, dismissLevelUp]);

  if (levelUp === null) return null;
  const rank = rankFor(levelUp);
  const newRank = rank.level === levelUp;

  return (
    <div className="levelup-overlay" onClick={dismissLevelUp} role="dialog" aria-modal="true" aria-label="Level up">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 12) * 0.08}s`,
              animationDuration: `${2.2 + (i % 5) * 0.3}s`,
            }}
          />
        ))}
      </div>
      <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Level up!</div>
        <LevelRing pct={100} size={120} stroke={8} color={rank.color}>
          <b>{levelUp}</b>
        </LevelRing>
        <h2>You reached level {levelUp}</h2>
        <p>
          {newRank ? (
            <>
              New rank unlocked: <strong style={{ color: rank.color }}>{rank.title}</strong>
            </>
          ) : (
            <>
              Rank: <strong style={{ color: rank.color }}>{rank.title}</strong> — keep the momentum going.
            </>
          )}
        </p>
        <button className="btn btn-primary" onClick={dismissLevelUp} autoFocus>
          Keep going
        </button>
      </div>
    </div>
  );
}

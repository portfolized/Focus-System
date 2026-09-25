"use client";

import {
  Check,
  CircleCheck,
  Crown,
  Flame,
  ListChecks,
  Lock,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import LevelRing from "@/components/LevelRing";
import { useStore } from "@/lib/client/store";
import { achievements, currentStreak, longestStreak, playerInfo, RANKS, type Achievement } from "@/lib/client/progress";
import { fmtDateShort, shiftDate, XP_REWARDS } from "@/lib/shared/logic";

const ICONS: Record<Achievement["icon"], typeof Check> = {
  check: CircleCheck,
  flame: Flame,
  timer: Timer,
  star: Star,
  target: Target,
  crown: Crown,
  trophy: Trophy,
  zap: Zap,
};

const EARN = [
  { icon: CircleCheck, label: "Complete a task", xp: XP_REWARDS.task },
  { icon: Zap, label: "Complete your main task", xp: XP_REWARDS.priorityTask },
  { icon: Timer, label: "Finish a focus session", xp: XP_REWARDS.focusSession },
  { icon: ListChecks, label: "Complete a subtask", xp: XP_REWARDS.subtask },
];

export default function RewardsPage() {
  const { data, today } = useStore();
  const player = playerInfo(data.user.xp);
  const list = achievements(data);
  const unlocked = list.filter((a) => a.unlocked).length;
  const streak = currentStreak(data, today);
  const best = longestStreak(data.streakDays);
  const active = new Set(data.streakDays);
  const days = Array.from({ length: 35 }, (_, i) => shiftDate(today, i - 34));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Points & progress</div>
          <h1>Rewards</h1>
        </div>
      </div>

      <section className="card rank-hero" style={{ "--rank": player.rank.color } as React.CSSProperties}>
        <LevelRing pct={player.pct} size={148} stroke={10} color={player.rank.color}>
          <small>Level</small>
          <b>{player.level}</b>
        </LevelRing>
        <div className="rank-hero-body">
          <div className="eyebrow">Current rank</div>
          <h2 style={{ color: player.rank.color }}>{player.rank.title}</h2>
          <p className="muted">
            {data.user.xp.toLocaleString()} XP total · {100 - player.xpInLevel} XP to level {player.level + 1}
            {player.rank.next && (
              <>
                {" "}
                · <strong>{player.rank.next.title}</strong> at level {player.rank.next.level}
              </>
            )}
          </p>
          <div className="bar bar-lg">
            <i style={{ width: `${player.pct}%`, background: player.rank.color }} />
          </div>
        </div>
        <div className="rank-hero-stats">
          <div>
            <Flame />
            <strong>{streak}</strong>
            <span>day streak</span>
          </div>
          <div>
            <Trophy />
            <strong>
              {unlocked}/{list.length}
            </strong>
            <span>achievements</span>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>
              <Zap /> How to earn XP
            </h3>
          </div>
          <ul className="earn-list">
            {EARN.map(({ icon: Icon, label, xp }) => (
              <li key={label}>
                <span className="earn-icon">
                  <Icon />
                </span>
                <span>{label}</span>
                <strong>+{xp} XP</strong>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Every 100 XP is a new level. Reopening a completed task takes its XP back, so points always match real
            work.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>
              <Flame /> Streak
            </h3>
            <span className="muted small">Best: {best} day{best === 1 ? "" : "s"}</span>
          </div>
          <div className="streak-grid">
            {days.map((ds) => (
              <i
                key={ds}
                title={`${fmtDateShort(ds)}${active.has(ds) ? " · active" : ""}`}
                className={`${active.has(ds) ? "on" : ""} ${ds === today ? "today" : ""}`}
              />
            ))}
          </div>
          <p className="muted small">
            A day counts when you add or complete a task, or finish a focus session. Keep the chain going.
          </p>
        </section>
      </div>

      <section>
        <div className="section-head">
          <h3>Achievements</h3>
          <span className="muted">
            {unlocked} of {list.length} unlocked
          </span>
        </div>
        <div className="achievements">
          {list.map((a) => {
            const Icon = ICONS[a.icon];
            return (
              <div key={a.id} className={`achievement ${a.unlocked ? "unlocked" : ""}`}>
                <span className="achievement-icon">{a.unlocked ? <Icon /> : <Lock />}</span>
                <div>
                  <strong>{a.title}</strong>
                  <span>{a.text}</span>
                  {!a.unlocked && (
                    <div className="bar bar-xs">
                      <i style={{ width: `${(a.current / a.target) * 100}%` }} />
                    </div>
                  )}
                </div>
                <em>{a.unlocked ? <Check /> : `${a.current}/${a.target}`}</em>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h3>Rank ladder</h3>
        </div>
        <div className="ranks">
          {RANKS.map((r) => {
            const reached = player.level >= r.level;
            const current = player.rank.title === r.title;
            return (
              <div
                key={r.title}
                className={`rank ${reached ? "reached" : ""} ${current ? "current" : ""}`}
                style={{ "--rank": r.color } as React.CSSProperties}
              >
                <Crown />
                <strong>{r.title}</strong>
                <span>Level {r.level}+</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

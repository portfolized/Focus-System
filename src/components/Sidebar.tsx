"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Target } from "lucide-react";
import { todayTasks, useStore } from "@/lib/client/store";
import { useTimer } from "@/lib/client/timer";
import { playerInfo } from "@/lib/client/progress";
import { fmtClock, focusModeLabel } from "@/lib/shared/logic";
import LevelRing from "./LevelRing";
import { NAV } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();
  const { data, today, online } = useStore();
  const { secondsLeft } = useTimer();

  const open = todayTasks(data.tasks, today, null).filter((t) => !t.completed).length;
  const player = playerInfo(data.user.xp);
  const initials = data.user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Target />
        </span>
        <span>Focus System</span>
      </Link>

      <nav className="side-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`side-link ${pathname === href ? "active" : ""}`}>
            <Icon />
            <span>{label}</span>
            {href === "/" && open > 0 && <em className="side-badge">{open}</em>}
            {href === "/focus" && data.focus.running && <em className="side-live" aria-label="Timer running" />}
          </Link>
        ))}
      </nav>

      {data.focus.running && pathname !== "/focus" && (
        <Link href="/focus" className={`mini-timer ${data.focus.mode === "work" ? "" : "break"}`}>
          <span>{focusModeLabel(data.focus.mode)}</span>
          <strong>{fmtClock(secondsLeft)}</strong>
        </Link>
      )}

      <Link href="/rewards" className="player-card" title="Your level and rewards">
        <LevelRing pct={player.pct} size={46} color={player.rank.color}>
          {player.level}
        </LevelRing>
        <div>
          <strong style={{ color: player.rank.color }}>{player.rank.title}</strong>
          <span>
            {player.xpInLevel}/100 XP · Level {player.level}
          </span>
        </div>
      </Link>

      <div className="side-footer">
        <Link href="/settings" className={`side-link ${pathname === "/settings" ? "active" : ""}`}>
          <Settings />
          <span>Settings</span>
        </Link>
        <div className="side-user" title={online ? "Synced" : "Offline — changes may not be saved"}>
          <div className="avatar">{initials || "?"}</div>
          <div>
            <strong>{data.user.name}</strong>
            <span>
              <i className={`sync-dot ${online ? "" : "offline"}`} />
              {online ? "Synced" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={pathname === href ? "active" : ""}>
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

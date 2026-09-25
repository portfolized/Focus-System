"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Moon, Plus, Search, Sparkles, Sun } from "lucide-react";
import { useNow } from "@/lib/client/clock";
import { useStore } from "@/lib/client/store";
import { useTheme } from "@/lib/client/theme";
import { currentStreak } from "@/lib/client/progress";

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  const { data, today, ui, setUi, openTaskEditor } = useStore();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  // Clock-dependent text renders after hydration to avoid SSR mismatches.
  const minute = useNow(60_000);
  const now = minute === null ? null : new Date(minute);
  const first = data.user.name.split(/\s+/)[0];
  const streak = currentStreak(data, today);
  const searchable = pathname === "/" || pathname === "/calendar";

  return (
    <header className="topbar">
      <div className="topbar-greeting">
        <h2>
          {now ? greeting(now) : "Hello"}
          {first ? `, ${first}` : ""}
        </h2>
        <span>
          {now
            ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
            : " "}
        </span>
      </div>

      {searchable && (
        <label className="search">
          <Search />
          <input
            type="text"
            placeholder="Search tasks"
            id="search-input"
            value={ui.searchQuery}
            onChange={(e) => setUi({ searchQuery: e.target.value })}
          />
          <kbd>Ctrl K</kbd>
        </label>
      )}

      <div className="topbar-actions">
        <Link href="/rewards" className={`chip chip-streak ${streak ? "lit" : ""}`} title="Daily streak">
          <Flame /> {streak}
        </Link>
        <Link href="/rewards" className="chip chip-xp" title="Total XP">
          <Sparkles /> {data.user.xp.toLocaleString()} XP
        </Link>
        <button
          className="icon-btn"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
        <button className="btn btn-primary new-task-btn" onClick={() => openTaskEditor(null)} title="New task (Ctrl N)">
          <Plus /> <span>New task</span>
        </button>
      </div>
    </header>
  );
}

// Client-side gamification on top of the server's XP: ranks, achievements and
// daily quests. Everything here is derived from bootstrap data, so the web and
// the mobile app keep sharing one XP total.

import { getLevelInfo, shiftDate, streakCount } from "@/lib/shared/logic";
import type { BootstrapDTO } from "@/lib/shared/types";

export const RANKS = [
  { level: 1, title: "Novice", color: "#94A3B8" },
  { level: 3, title: "Apprentice", color: "#5EEAD4" },
  { level: 5, title: "Focused", color: "#60A5FA" },
  { level: 8, title: "Disciplined", color: "#A78BFA" },
  { level: 12, title: "Deep Worker", color: "#F472B6" },
  { level: 16, title: "Flow Master", color: "#FB923C" },
  { level: 20, title: "Zen Master", color: "#FBBF24" },
  { level: 30, title: "Legend", color: "#F87171" },
] as const;

export function rankFor(level: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  let next: (typeof RANKS)[number] | null = null;
  for (const r of RANKS) {
    if (level >= r.level) current = r;
    else {
      next = r;
      break;
    }
  }
  return { ...current, next };
}

export function playerInfo(xp: number) {
  const lvl = getLevelInfo(xp);
  return { ...lvl, rank: rankFor(lvl.level), pct: lvl.xpInLevel };
}

/** Longest run of consecutive active days. */
export function longestStreak(days: string[]) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of sorted) {
    run = prev && shiftDate(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function sessionsOn(data: BootstrapDTO, date: string) {
  return data.pomoLogs.filter((l) => l.date === date).reduce((s, l) => s + (l.sessions || 1), 0);
}

export function focusMinutes(data: BootstrapDTO, dates?: Set<string>) {
  return data.pomoLogs
    .filter((l) => !dates || dates.has(l.date))
    .reduce((s, l) => s + (l.minutes || (l.sessions || 1) * data.user.settings.pomoWork), 0);
}

export interface Quest {
  id: string;
  title: string;
  current: number;
  target: number;
  done: boolean;
}

/** Small daily targets that keep the loop "plan → focus → finish" moving. */
export function dailyQuests(data: BootstrapDTO, today: string): Quest[] {
  const todays = data.tasks.filter((t) => t.dueDate === today);
  const doneToday = todays.filter((t) => t.completed).length;
  const sessions = sessionsOn(data, today);
  const tomorrow = shiftDate(today, 1);
  const planned = data.tasks.some((t) => t.dueDate === tomorrow) ? 1 : 0;
  const cleared = todays.length > 0 && doneToday === todays.length ? 1 : 0;
  const q = (id: string, title: string, current: number, target: number): Quest => ({
    id,
    title,
    current: Math.min(current, target),
    target,
    done: current >= target,
  });
  return [
    q("tasks", "Complete 3 tasks", doneToday, 3),
    q("focus", "Finish 2 focus sessions", sessions, 2),
    q("plan", "Plan something for tomorrow", planned, 1),
    q("clear", "Clear today's list", cleared, 1),
  ];
}

export interface Achievement {
  id: string;
  title: string;
  text: string;
  icon: "check" | "flame" | "timer" | "star" | "target" | "crown" | "trophy" | "zap";
  current: number;
  target: number;
  unlocked: boolean;
}

export function achievements(data: BootstrapDTO): Achievement[] {
  const completed = data.tasks.filter((t) => t.completed).length;
  const sessions = data.pomoLogs.reduce((s, l) => s + (l.sessions || 1), 0);
  const minutes = focusMinutes(data);
  const best = longestStreak(data.streakDays);
  const level = getLevelInfo(data.user.xp).level;
  const byDay = new Map<string, { total: number; done: number }>();
  for (const t of data.tasks) {
    const d = byDay.get(t.dueDate) ?? { total: 0, done: 0 };
    d.total++;
    if (t.completed) d.done++;
    byDay.set(t.dueDate, d);
  }
  const perfectDays = [...byDay.values()].filter((d) => d.total >= 3 && d.done === d.total).length;
  const subsDone = data.tasks.reduce((s, t) => s + t.subtasks.filter((x) => x.completed).length, 0);

  const a = (
    id: string,
    title: string,
    text: string,
    icon: Achievement["icon"],
    current: number,
    target: number,
  ): Achievement => ({ id, title, text, icon, current: Math.min(current, target), target, unlocked: current >= target });

  return [
    a("first-task", "First Step", "Complete your first task", "check", completed, 1),
    a("tasks-25", "Getting Things Done", "Complete 25 tasks", "check", completed, 25),
    a("tasks-100", "Centurion", "Complete 100 tasks", "trophy", completed, 100),
    a("focus-1", "Into the Zone", "Finish a focus session", "timer", sessions, 1),
    a("focus-25", "Deep Diver", "Finish 25 focus sessions", "timer", sessions, 25),
    a("focus-10h", "Ten Hours Deep", "Focus for 600 minutes in total", "zap", minutes, 600),
    a("streak-3", "On a Roll", "Reach a 3-day streak", "flame", best, 3),
    a("streak-7", "Week Warrior", "Reach a 7-day streak", "flame", best, 7),
    a("streak-30", "Unstoppable", "Reach a 30-day streak", "flame", best, 30),
    a("perfect", "Perfect Day", "Finish every task on a day with 3 or more", "star", perfectDays, 1),
    a("goals-3", "Goal Setter", "Create 3 goals", "target", data.goals.length, 3),
    a("subs-20", "Detail Oriented", "Complete 20 subtasks", "check", subsDone, 20),
    a("level-5", "Rising Star", "Reach level 5", "crown", level, 5),
    a("level-10", "Elite", "Reach level 10", "crown", level, 10),
  ];
}

export function currentStreak(data: BootstrapDTO, today: string) {
  return streakCount(data.streakDays, today);
}

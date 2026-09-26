"use client";

import { CalendarCheck, CircleCheck, Timer, TrendingUp } from "lucide-react";
import { tasksForDate, useStore, type AnalyticsPeriod } from "@/lib/client/store";
import { focusMinutes, sessionsOn } from "@/lib/client/progress";
import { fmtDateShort, shiftDate } from "@/lib/shared/logic";
import type { TaskDTO } from "@/lib/shared/types";

function periodDays(today: string, period: AnalyticsPeriod) {
  const count = period === "day" ? 1 : period === "month" ? 30 : 7;
  return Array.from({ length: count }, (_, i) => shiftDate(today, i - count + 1));
}

export default function AnalyticsPage() {
  const { data, today, ui, setUi } = useStore();
  const period = ui.analyticsPeriod;
  const days = periodDays(today, period);
  const daySet = new Set(days);
  const tasks = data.tasks.filter((t) => t.dueDate !== null && daySet.has(t.dueDate));
  const done = tasks.filter((t) => t.completed);
  const rate = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const sessions = days.reduce((s, d) => s + sessionsOn(data, d), 0);
  const minutes = focusMinutes(data, daySet);
  const bestDay =
    days
      .map((ds) => ({ date: ds, done: tasksForDate(data.tasks, ds).filter((x) => x.completed).length }))
      .sort((a, b) => b.done - a.done)[0] ?? { date: today, done: 0 };
  const avg = days.length ? Math.round((done.length / days.length) * 10) / 10 : 0;
  const periodLabel = period === "day" ? "Today" : period === "week" ? "Last 7 days" : "Last 30 days";
  const minutesByDay = days.map((ds) => focusMinutes(data, new Set([ds])));
  const maxMinutes = Math.max(30, ...minutesByDay);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{periodLabel}</div>
          <h1>Stats</h1>
        </div>
        <div className="segmented segmented-sm">
          {(["day", "week", "month"] as const).map((p) => (
            <button key={p} className={period === p ? "active" : ""} onClick={() => setUi({ analyticsPeriod: p })}>
              {p === "day" ? "Today" : p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      <section className="metrics">
        <Metric icon={<CircleCheck />} tone="teal" label="Completion" value={`${rate}%`} sub={`${done.length} of ${tasks.length} tasks`} />
        <Metric icon={<TrendingUp />} tone="primary" label="Daily average" value={String(avg)} sub="tasks completed" />
        <Metric icon={<Timer />} tone="pink" label="Focus time" value={fmtMinutes(minutes)} sub={`${sessions} sessions`} />
        <Metric icon={<CalendarCheck />} tone="gold" label="Best day" value={String(bestDay.done)} sub={fmtDateShort(bestDay.date)} />
      </section>

      {period !== "day" && (
        <div className="grid-2">
          <section className="card">
            <div className="card-head">
              <h3>Tasks completed</h3>
            </div>
            <div className={`bars ${days.length > 10 ? "dense" : ""}`}>
              {days.map((ds) => {
                const list = tasksForDate(data.tasks, ds);
                const d = list.filter((t) => t.completed).length;
                const r = list.length ? Math.round((d / list.length) * 100) : 0;
                return (
                  <div className="bar-col" key={ds} title={`${fmtDateShort(ds)}: ${d}/${list.length} (${r}%)`}>
                    <div className="bar-v">
                      <i className={r >= 80 ? "good" : r >= 40 ? "" : "low"} style={{ height: `${list.length ? Math.max(4, r) : 0}%` }} />
                    </div>
                    <span>{days.length > 10 ? new Date(ds + "T00:00:00").getDate() : fmtDay(ds)}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <h3>Focus minutes</h3>
            </div>
            <div className={`bars ${days.length > 10 ? "dense" : ""}`}>
              {days.map((ds, i) => (
                <div className="bar-col" key={ds} title={`${fmtDateShort(ds)}: ${minutesByDay[i]} min`}>
                  <div className="bar-v">
                    <i className="focus" style={{ height: `${(minutesByDay[i] / maxMinutes) * 100}%` }} />
                  </div>
                  <span>{days.length > 10 ? new Date(ds + "T00:00:00").getDate() : fmtDay(ds)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>By goal</h3>
          </div>
          <GoalBreakdown tasks={tasks} />
        </section>
        <section className="card">
          <div className="card-head">
            <h3>Open tasks by priority</h3>
          </div>
          <Matrix tasks={tasks} />
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Activity · last 12 weeks</h3>
          <span className="legend">
            Less <i className="l0" />
            <i className="l1" />
            <i className="l2" />
            <i className="l3" />
            <i className="l4" /> More
          </span>
        </div>
        <Heatmap />
      </section>
    </div>
  );
}

function fmtDay(ds: string) {
  return new Date(ds + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

function fmtMinutes(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Metric({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className={`card metric tone-${tone}`}>
      <span className="stat-icon">{icon}</span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <em>{sub}</em>
    </div>
  );
}

/** One cell per day for 12 weeks, shaded by tasks completed + focus sessions. */
function Heatmap() {
  const { data, today } = useStore();
  const end = new Date(today + "T00:00:00");
  // Finish the grid on Saturday of this week so columns are whole weeks.
  const lastDay = shiftDate(today, 6 - end.getDay());
  const cells = Array.from({ length: 84 }, (_, i) => shiftDate(lastDay, i - 83));
  const doneByDay = new Map<string, number>();
  for (const t of data.tasks) if (t.completed && t.dueDate) doneByDay.set(t.dueDate, (doneByDay.get(t.dueDate) ?? 0) + 1);
  return (
    <div className="heatmap">
      {cells.map((ds) => {
        const score = (doneByDay.get(ds) ?? 0) + sessionsOn(data, ds);
        const level = ds > today ? -1 : score === 0 ? 0 : score <= 2 ? 1 : score <= 4 ? 2 : score <= 7 ? 3 : 4;
        return (
          <i
            key={ds}
            className={level < 0 ? "future" : `l${level}`}
            title={ds > today ? "" : `${fmtDateShort(ds)}: ${doneByDay.get(ds) ?? 0} tasks, ${sessionsOn(data, ds)} sessions`}
          />
        );
      })}
    </div>
  );
}

function GoalBreakdown({ tasks }: { tasks: TaskDTO[] }) {
  const { data } = useStore();
  const rows = data.goals
    .map((g) => {
      const gt = tasks.filter((t) => t.goalId === g.id);
      return { key: g.id, title: g.title, color: g.color, total: gt.length, done: gt.filter((t) => t.completed).length };
    })
    .filter((r) => r.total > 0);
  const none = tasks.filter((t) => !t.goalId);
  if (none.length) {
    rows.push({
      key: "none",
      title: "No goal",
      color: "var(--text-3)",
      total: none.length,
      done: none.filter((t) => t.completed).length,
    });
  }
  if (!rows.length) return <p className="muted small">No tasks in this period yet.</p>;
  return (
    <div className="breakdown">
      {rows.map((r) => {
        const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
        return (
          <div className="breakdown-row" key={r.key}>
            <span className="dot" style={{ background: r.color }} />
            <div>
              <strong>{r.title}</strong>
              <div className="bar bar-sm">
                <i style={{ width: `${pct}%`, background: r.color }} />
              </div>
            </div>
            <em>
              {r.done}/{r.total}
            </em>
          </div>
        );
      })}
    </div>
  );
}

function Matrix({ tasks }: { tasks: TaskDTO[] }) {
  const open = tasks.filter((t) => !t.completed);
  const keys = [
    ["do-first", "Do first", "Urgent · important"],
    ["schedule", "Schedule", "Important"],
    ["delegate", "Delegate", "Urgent"],
    ["eliminate", "Eliminate", "Neither"],
  ] as const;
  const unset = open.filter((t) => !t.eisenhower).length;
  return (
    <>
      <div className="matrix">
        {keys.map(([k, label, hint]) => (
          <div className={`matrix-cell m-${k}`} key={k}>
            <strong>{open.filter((t) => t.eisenhower === k).length}</strong>
            <span>{label}</span>
            <em>{hint}</em>
          </div>
        ))}
      </div>
      {unset > 0 && <p className="muted small">{unset} open task(s) have no priority set. Set it in the task editor.</p>}
    </>
  );
}

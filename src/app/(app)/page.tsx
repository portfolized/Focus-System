"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  Flame,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import TaskCard from "@/components/TaskCard";
import LevelRing from "@/components/LevelRing";
import LegacyImportBanner from "@/components/LegacyImportBanner";
import { frogTask, tasksForDate, todayTasks, useStore } from "@/lib/client/store";
import { useToast } from "@/lib/client/toast";
import { currentStreak, dailyQuests, focusMinutes, playerInfo } from "@/lib/client/progress";
import { fmtDateShort, shiftDate, timeToMinutes, XP_REWARDS } from "@/lib/shared/logic";

export default function TodayPage() {
  const store = useStore();
  const { data, today, ui, setUi, createGoal, editGoal, deleteGoal, toggleComplete, attachTask, updateTask } = store;
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);

  let tasks = todayTasks(data.tasks, today, ui.activeGoalId);
  if (ui.searchQuery) {
    const q = ui.searchQuery.toLowerCase();
    tasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
  }
  // Main task first, then timed tasks in order, then the rest.
  const openTasks = tasks
    .filter((t) => !t.completed)
    .sort(
      (a, b) =>
        Number(b.isPriority) - Number(a.isPriority) ||
        (timeToMinutes(a.startTime) ?? 9999) - (timeToMinutes(b.startTime) ?? 9999),
    );
  const doneTasks = tasks.filter((t) => t.completed);
  const overdue = data.tasks.filter((t) => !t.completed && t.dueDate < today);
  const allToday = tasksForDate(data.tasks, today);
  const done = allToday.filter((t) => t.completed).length;
  const total = allToday.length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const frog = frogTask(data.tasks, today);
  const quests = dailyQuests(data, today);
  const questsDone = quests.filter((q) => q.done).length;
  const player = playerInfo(data.user.xp);
  const minutesToday = focusMinutes(data, new Set([today]));
  const streak = currentStreak(data, today);

  const focusOn = async (id: string) => {
    if (data.focus.attachedTaskId !== id) await attachTask(id);
    router.push("/focus");
  };

  return (
    <div className="page">
      <LegacyImportBanner />

      <section className="today-hero">
        <div className="card hero-card">
          <div className="hero-main">
            <LevelRing pct={rate} size={132} stroke={11} color="url(#hero-grad)">
              <b>{rate}%</b>
              <small>done</small>
            </LevelRing>
            <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="hero-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--teal)" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <div className="eyebrow">{fmtDateShort(today)} · Today</div>
              <h1>
                {total === 0
                  ? "Plan your day"
                  : done === total
                    ? "All done. Great work!"
                    : `${total - done} task${total - done === 1 ? "" : "s"} to go`}
              </h1>
              <p className="muted">
                {total === 0
                  ? "Add a few clear actions below, then pick one main task."
                  : "Do one thing at a time. Every finished task earns XP."}
              </p>
            </div>
          </div>
          <div className="stat-strip">
            <Stat icon={<CircleCheck />} label="Completed" value={`${done}/${total}`} tone="teal" />
            <Stat icon={<Timer />} label="Focus today" value={`${minutesToday}m`} tone="primary" />
            <Stat icon={<Flame />} label="Streak" value={`${streak}d`} tone="coral" />
            <Stat icon={<Sparkles />} label={`Level ${player.level}`} value={`${player.xpInLevel}/100`} tone="gold" />
          </div>
        </div>

        <div className="card quests-card">
          <div className="card-head">
            <h3>
              <Target /> Daily quests
            </h3>
            <span className="count-pill">
              {questsDone}/{quests.length}
            </span>
          </div>
          <ul className="quests">
            {quests.map((q) => (
              <li key={q.id} className={q.done ? "done" : ""}>
                <span className="quest-check">{q.done && <Check />}</span>
                <div>
                  <span>{q.title}</span>
                  <div className="bar bar-sm">
                    <i style={{ width: `${(q.current / q.target) * 100}%` }} />
                  </div>
                </div>
                <em>
                  {q.current}/{q.target}
                </em>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`card spotlight ${frog ? "" : "empty"}`}>
        <div className="spotlight-icon">
          <Zap />
        </div>
        {frog ? (
          <>
            <div className="spotlight-body">
              <div className="eyebrow">Main task · +{XP_REWARDS.priorityTask} XP</div>
              <h2>{frog.title}</h2>
            </div>
            <div className="spotlight-actions">
              <button className="btn btn-primary" onClick={() => focusOn(frog.id)}>
                <Play /> Focus
              </button>
              <button className="btn btn-success" onClick={() => toggleComplete(frog.id)}>
                <Check /> Done
              </button>
              <button className="icon-btn" onClick={store.clearFrog} title="Unset main task">
                <X />
              </button>
            </div>
          </>
        ) : (
          <div className="spotlight-body">
            <div className="eyebrow">No main task yet</div>
            <p>
              Pick the one task that matters most today. Tap <Zap className="inline-icon" /> on it to make it your main
              task. It&apos;s worth <strong>+{XP_REWARDS.priorityTask} XP</strong>.
            </p>
          </div>
        )}
      </section>

      <QuickAdd />

      <WeekStrip />

      <section className="goal-bar">
        <button
          className={`pill ${ui.activeGoalId === null ? "active" : ""}`}
          onClick={() => setUi({ activeGoalId: null })}
        >
          All tasks
        </button>
        {data.goals.map((g) => {
          const sel = ui.activeGoalId === g.id;
          return (
            <span key={g.id} className={`pill pill-goal ${sel ? "active" : ""}`} style={{ "--goal": g.color } as React.CSSProperties}>
              <button onClick={() => setUi({ activeGoalId: sel ? null : g.id })}>
                <i />
                {g.title}
              </button>
              <button className="pill-mini" onClick={() => editGoal(g.id)} title="Edit goal">
                <Pencil />
              </button>
              <button className="pill-mini" onClick={() => deleteGoal(g.id)} title="Delete goal">
                <Trash2 />
              </button>
            </span>
          );
        })}
        <button className="pill pill-add" onClick={createGoal}>
          <Plus /> Goal
        </button>
      </section>

      {overdue.length > 0 && !ui.searchQuery && (
        <section className="card overdue">
          <div className="card-head">
            <h3>
              <AlarmClock /> Overdue
            </h3>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => overdue.forEach((t) => updateTask(t.id, { dueDate: today }))}
            >
              Move all to today <ArrowRight />
            </button>
          </div>
          <ul className="overdue-list">
            {overdue.slice(0, 5).map((t) => (
              <li key={t.id}>
                <span>{t.title}</span>
                <em>{fmtDateShort(t.dueDate)}</em>
                <button className="btn btn-sm btn-secondary" onClick={() => updateTask(t.id, { dueDate: today })}>
                  Today
                </button>
              </li>
            ))}
            {overdue.length > 5 && <li className="muted">+{overdue.length - 5} more</li>}
          </ul>
        </section>
      )}

      <section>
        <div className="section-head">
          <h3>Up next</h3>
          <span className="muted">{openTasks.length} open</span>
        </div>
        <div className="task-list">
          {openTasks.length === 0 ? (
            <div className="empty">
              <CircleCheck />
              <h4>{ui.searchQuery ? "No matching tasks" : total ? "Everything is done" : "Your list is clear"}</h4>
              <p>{ui.searchQuery ? "Try a different search." : "Add one clear action above to get started."}</p>
            </div>
          ) : (
            openTasks.map((t) => <TaskCard key={t.id} task={t} />)
          )}
        </div>
      </section>

      {doneTasks.length > 0 && (
        <section>
          <button className="section-head section-toggle" onClick={() => setShowDone((s) => !s)} aria-expanded={showDone}>
            <h3>Completed</h3>
            <span className="muted">{doneTasks.length}</span>
            <ChevronDown className={showDone ? "flip" : ""} />
          </button>
          {showDone && (
            <div className="task-list">
              {doneTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`stat tone-${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function QuickAdd() {
  const { data, today, ui, setUi, createTask } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState<string>(ui.activeGoalId ?? "");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(ui.selectedDate < today ? today : ui.selectedDate || today);
  const [priority, setPriority] = useState(false);
  const [adding, setAdding] = useState(false);

  const quickAdd = async () => {
    if (!title.trim() || adding) return;
    const dueDate = date || today;
    if (dueDate < today) return toast("Cannot schedule tasks in the past", "error");
    if (time && dueDate === today) {
      const now = new Date();
      if ((timeToMinutes(time) ?? 0) <= now.getHours() * 60 + now.getMinutes()) {
        return toast("Cannot schedule a past time for today", "error");
      }
    }
    setAdding(true);
    const created = await createTask({
      title: title.trim(),
      goalId: goalId || null,
      dueDate,
      startTime: time || null,
      isPriority: priority,
    });
    setAdding(false);
    if (created) {
      setTitle("");
      setTime("");
      setPriority(false);
      toast(dueDate === today ? "Task added" : `Task added for ${fmtDateShort(dueDate)}`, "success");
    }
  };

  return (
    <section className="card quick-add">
      <div className="quick-row">
        <Plus className="quick-plus" />
        <input
          type="text"
          placeholder="Add a clear next action and press Enter"
          id="quick-add-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickAdd()}
        />
        <button className="btn btn-primary" onClick={quickAdd} disabled={adding || !title.trim()}>
          Add
        </button>
      </div>
      <div className="quick-options">
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label="Goal">
          <option value="">No goal</option>
          {data.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          min={today}
          aria-label="Due date"
          onChange={(e) => {
            setDate(e.target.value);
            setUi({ selectedDate: e.target.value });
          }}
        />
        <input type="time" value={time} aria-label="Start time" onChange={(e) => setTime(e.target.value)} />
        <button
          type="button"
          className={`toggle-chip ${priority ? "on" : ""}`}
          onClick={() => setPriority((p) => !p)}
          aria-pressed={priority}
        >
          <Zap /> Main task
        </button>
      </div>
    </section>
  );
}

function WeekStrip() {
  const { data, today, setUi } = useStore();
  const router = useRouter();
  return (
    <section className="week">
      {Array.from({ length: 7 }, (_, i) => {
        const ds = shiftDate(today, i);
        const d = new Date(ds + "T00:00:00");
        const list = tasksForDate(data.tasks, ds);
        const dayDone = list.filter((t) => t.completed).length;
        const dayRate = list.length ? Math.round((dayDone / list.length) * 100) : 0;
        return (
          <button
            key={ds}
            className={`week-day ${ds === today ? "today" : ""}`}
            onClick={() => {
              setUi({ selectedDate: ds, calendarMonth: d.getMonth(), calendarYear: d.getFullYear() });
              router.push("/calendar");
            }}
            title={`${list.length} task${list.length === 1 ? "" : "s"}`}
          >
            <span>{i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}</span>
            <strong>{d.getDate()}</strong>
            <div className="bar bar-xs">
              <i style={{ width: `${dayRate}%` }} />
            </div>
            <em>{list.length ? `${dayDone}/${list.length}` : "—"}</em>
          </button>
        );
      })}
    </section>
  );
}

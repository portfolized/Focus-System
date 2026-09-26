"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleCheck,
  ListEnd,
  ListTodo,
  Pencil,
  Plus,
  Sun,
  Timer,
  Trash2,
  Trophy,
} from "lucide-react";
import TaskCard from "@/components/TaskCard";
import { useStore } from "@/lib/client/store";
import { useToast } from "@/lib/client/toast";
import { doneOn, goalTasks } from "@/lib/client/goals";
import { fmtDate, fmtDateShort, shiftDate } from "@/lib/shared/logic";
import type { TaskDTO } from "@/lib/shared/types";

type Tab = "queue" | "planned" | "done";

/** One goal: add tasks to its queue, send them to a day, and see everything done for it. */
export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goalId = id === "none" ? null : id;
  const { data, today, createTask, editGoal, deleteGoal } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("queue");
  const [title, setTitle] = useState("");
  const [addTo, setAddTo] = useState<string | null>(null); // null = queue
  const [adding, setAdding] = useState(false);

  const goal = goalId ? data.goals.find((g) => g.id === goalId) : null;
  if (goalId && !goal) {
    return (
      <div className="page">
        <div className="empty">
          <h4>This goal no longer exists</h4>
          <Link href="/goals" className="btn btn-secondary">
            <ArrowLeft /> All goals
          </Link>
        </div>
      </div>
    );
  }

  const color = goal?.color ?? "var(--text-2)";
  const tasks = goalTasks(data.tasks, goalId);
  const pct = tasks.total ? Math.round((tasks.done.length / tasks.total) * 100) : 0;

  const add = async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    const created = await createTask({ title: title.trim(), goalId, dueDate: addTo });
    setAdding(false);
    if (!created) return;
    setTitle("");
    toast(
      addTo === null ? "Added to the queue" : addTo === today ? "Added to today" : `Added for ${fmtDateShort(addTo)}`,
      "success",
    );
  };

  const remove = async () => {
    if (goal && (await deleteGoal(goal.id))) router.push("/goals");
  };

  const tabs: { key: Tab; label: string; count: number; icon: typeof ListTodo }[] = [
    { key: "queue", label: "Queue", count: tasks.queue.length, icon: ListTodo },
    { key: "planned", label: "Planned", count: tasks.planned.length, icon: CalendarDays },
    { key: "done", label: "Done", count: tasks.done.length, icon: CircleCheck },
  ];

  return (
    <div className="page goal-page" style={{ "--goal": color } as React.CSSProperties}>
      <div className="page-head">
        <div>
          <Link href="/goals" className="eyebrow eyebrow-link">
            <ArrowLeft /> Goals
          </Link>
          <h1 className="goal-title">
            <i className="goal-dot" style={{ background: color }} />
            {goal?.title ?? "No goal"}
          </h1>
        </div>
        {goal && (
          <div className="btn-row">
            <button className="btn btn-sm btn-secondary" onClick={() => editGoal(goal.id)}>
              <Pencil /> Edit
            </button>
            <button className="btn btn-sm btn-ghost danger-text" onClick={remove}>
              <Trash2 /> Delete
            </button>
          </div>
        )}
      </div>

      <section className="card goal-stats">
        <div className="goal-stat-row">
          <Stat value={tasks.done.length} label="Done" tone="success" />
          <Stat value={tasks.queue.length} label="In queue" tone="teal" />
          <Stat value={tasks.planned.length} label="Planned" tone="primary" />
          <Stat value={tasks.sessions} label="Focus sessions" tone="coral" />
        </div>
        <div className="bar bar-sm goal-bar-progress">
          <i style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="card quick-add">
        <div className="quick-row">
          <Plus className="quick-plus" />
          <input
            type="text"
            placeholder="What needs doing for this goal?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn btn-primary" onClick={add} disabled={adding || !title.trim()}>
            Add
          </button>
        </div>
        <div className="quick-options">
          <button
            type="button"
            className={`toggle-chip toggle-chip-teal ${addTo === null ? "on" : ""}`}
            onClick={() => setAddTo(null)}
          >
            <ListEnd /> Queue (no date)
          </button>
          <button
            type="button"
            className={`toggle-chip toggle-chip-teal ${addTo === today ? "on" : ""}`}
            onClick={() => setAddTo(today)}
          >
            <Sun /> Today
          </button>
          <input
            type="date"
            min={today}
            aria-label="Pick a day"
            value={addTo && addTo !== today ? addTo : ""}
            onChange={(e) => setAddTo(e.target.value || null)}
          />
        </div>
      </section>

      <div className="segmented goal-tabs" role="tablist">
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            <Icon /> {label} <em className="count-pill">{count}</em>
          </button>
        ))}
      </div>

      {tab === "queue" &&
        (tasks.queue.length === 0 ? (
          <div className="empty">
            <ListEnd />
            <h4>Queue is empty</h4>
            <p>Add tasks above without a date. Send one to today whenever you are ready.</p>
          </div>
        ) : (
          <div className="task-list">
            <p className="muted small">Not on any day yet. Send a task to today, or pick any day.</p>
            {tasks.queue.map((t) => (
              <QueueRow key={t.id} task={t} />
            ))}
          </div>
        ))}

      {tab === "planned" &&
        (tasks.planned.length === 0 ? (
          <div className="empty">
            <CalendarDays />
            <h4>Nothing planned</h4>
            <p>Tasks you put on a day show up here until they are done.</p>
          </div>
        ) : (
          <div className="task-list">
            {tasks.planned.map((t) => (
              <PlannedRow key={t.id} task={t} />
            ))}
          </div>
        ))}

      {tab === "done" && <DoneList tasks={tasks.done} />}
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className={`goal-stat tone-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** A queued task: tick it off, send it to today, or pick any day. */
function QueueRow({ task: t }: { task: TaskDTO }) {
  const { today, toggleComplete, scheduleTask, openTaskEditor, deleteTask } = useStore();
  const doneSubs = t.subtasks.filter((s) => s.completed).length;
  return (
    <div className="queue-row">
      <button className="check" role="checkbox" aria-checked={false} aria-label="Mark as done" onClick={() => toggleComplete(t.id)}>
        <Check />
      </button>
      <button className="queue-body" onClick={() => openTaskEditor(t.id)}>
        <strong>{t.title}</strong>
        {(t.subtasks.length > 0 || t.description) && (
          <small>
            {[t.subtasks.length ? `${doneSubs}/${t.subtasks.length} subtasks` : null, t.description || null]
              .filter(Boolean)
              .join(" · ")}
          </small>
        )}
      </button>
      <button className="btn btn-sm btn-secondary" onClick={() => scheduleTask(t.id, today)}>
        <Sun /> Today
      </button>
      <label className="icon-btn date-pick" title="Schedule on a day">
        <CalendarPlus />
        <input
          type="date"
          min={today}
          aria-label="Schedule on a day"
          onChange={(e) => e.target.value && scheduleTask(t.id, e.target.value)}
        />
      </label>
      <button className="icon-btn danger" onClick={() => deleteTask(t.id)} title="Delete">
        <Trash2 />
      </button>
    </div>
  );
}

function PlannedRow({ task: t }: { task: TaskDTO }) {
  const { scheduleTask } = useStore();
  return (
    <div className="planned-row">
      <TaskCard task={t} showDate />
      <button className="btn btn-sm btn-ghost" onClick={() => scheduleTask(t.id, null)} title="Remove its date">
        <ListEnd /> Back to queue
      </button>
    </div>
  );
}

function DoneList({ tasks }: { tasks: TaskDTO[] }) {
  const { today, toggleComplete, openTaskEditor } = useStore();
  if (tasks.length === 0) {
    return (
      <div className="empty">
        <Trophy />
        <h4>Nothing done yet</h4>
        <p>Finished tasks for this goal collect here — your track record.</p>
      </div>
    );
  }
  const label = (d: string | null) =>
    d === null ? "Done" : d === today ? "Done today" : d === shiftDate(today, -1) ? "Done yesterday" : `Done ${fmtDate(d)}`;
  const groups: { day: string | null; items: TaskDTO[] }[] = [];
  for (const t of tasks) {
    const d = doneOn(t);
    const last = groups[groups.length - 1];
    if (last && last.day === d) last.items.push(t);
    else groups.push({ day: d, items: [t] });
  }
  return (
    <div className="done-groups">
      {groups.map((g) => (
        <div key={g.day ?? "none"} className="done-group">
          <div className="eyebrow done-day">{label(g.day)}</div>
          {g.items.map((t) => (
            <div key={t.id} className="done-row">
              <button className="check on" role="checkbox" aria-checked aria-label="Mark as not done" onClick={() => toggleComplete(t.id)}>
                <Check />
              </button>
              <button className="done-title" onClick={() => openTaskEditor(t.id)}>
                {t.title}
              </button>
              {t.pomodoroCount > 0 && (
                <span className="meta">
                  <Timer /> {t.pomodoroCount}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

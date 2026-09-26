"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, ChevronLeft, ChevronRight, Lock, Plus, Zap } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import { tasksForDate, useStore } from "@/lib/client/store";
import { useToast } from "@/lib/client/toast";
import { fmtDate, fmtDateShort, timeToMinutes, toDateStr } from "@/lib/shared/logic";
import type { TaskDTO } from "@/lib/shared/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { data, today, ui, setUi } = useStore();
  const cm = ui.calendarMonth;
  const cy = ui.calendarYear;
  const selected = ui.selectedDate || today;

  let selectedTasks = tasksForDate(data.tasks, selected);
  if (ui.searchQuery) {
    const q = ui.searchQuery.toLowerCase();
    selectedTasks = selectedTasks.filter((t) => t.title.toLowerCase().includes(q));
  }
  const active = selectedTasks.filter((t) => !t.completed);
  const completed = selectedTasks.filter((t) => t.completed);
  const done = completed.length;
  const total = selectedTasks.length;
  const rate = total ? Math.round((done / total) * 100) : 0;

  const selectDate = (ds: string) => {
    const d = new Date(ds + "T00:00:00");
    setUi({ selectedDate: ds, calendarMonth: d.getMonth(), calendarYear: d.getFullYear() });
  };
  const navMonth = (dir: number) => {
    let m = cm + dir;
    let y = cy;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setUi({ calendarMonth: m, calendarYear: y });
  };

  // Month grid: leading days of the previous month, the month, trailing days to 42 cells.
  const firstDay = new Date(cy, cm, 1).getDay();
  const daysInMonth = new Date(cy, cm + 1, 0).getDate();
  const prevMonthDays = new Date(cy, cm, 0).getDate();
  const cells: { day: number; date: string; other: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells.push({ day, date: toDateStr(new Date(cy, cm - 1, day)), other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: toDateStr(new Date(cy, cm, d)), other: false });
  for (let next = 1; cells.length < 42; next++) {
    cells.push({ day: next, date: toDateStr(new Date(cy, cm + 1, next)), other: true });
  }

  return (
    <section className="calendar-page">
      <div className="card calendar-main">
        <div className="page-head">
          <div>
            <Link href="/" className="eyebrow eyebrow-link">
              <ArrowLeft /> Today · Calendar
            </Link>
            <h1>
              {MONTHS[cm]} {cy}
            </h1>
          </div>
          <div className="btn-row">
            <button className="icon-btn bordered" onClick={() => navMonth(-1)} title="Previous month">
              <ChevronLeft />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => selectDate(today)}>
              Today
            </button>
            <button className="icon-btn bordered" onClick={() => navMonth(1)} title="Next month">
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="cal-grid">
          {DAY_NAMES.map((n) => (
            <div className="cal-dow" key={n}>
              {n}
            </div>
          ))}
          {cells.map((c) => (
            <DayCell
              key={c.date + (c.other ? "o" : "")}
              day={c.day}
              date={c.date}
              other={c.other}
              tasks={tasksForDate(data.tasks, c.date)}
              today={today}
              selected={selected}
              onSelect={selectDate}
            />
          ))}
        </div>
      </div>

      <aside className="card day-panel">
        <div className="card-head">
          <div>
            <div className="eyebrow">{selected === today ? "Today" : "Selected day"}</div>
            <h2>{fmtDate(selected)}</h2>
          </div>
          <span className="count-pill">
            {done}/{total}
          </span>
        </div>
        <div className="bar bar-sm">
          <i style={{ width: `${rate}%` }} />
        </div>
        {selected < today ? (
          <div className="note">
            <Lock />
            <span>Past dates are read-only. Pick today or a future date to add tasks.</span>
          </div>
        ) : (
          <DayComposer date={selected} key={selected} />
        )}
        <div className="section-head">
          <h3>Tasks</h3>
          <span className="muted">{active.length} open</span>
        </div>
        {active.length ? (
          <div className="task-list">
            {active.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <CalendarPlus />
            <h4>{total === 0 ? "Nothing planned" : "All clear"}</h4>
            <p>{total === 0 ? "Add one task above for this date." : "Every task for this date is completed."}</p>
          </div>
        )}
        {completed.length > 0 && (
          <>
            <div className="section-head">
              <h3>Completed</h3>
              <span className="muted">{completed.length}</span>
            </div>
            <div className="task-list">
              {completed.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </>
        )}
      </aside>
    </section>
  );
}

function DayCell(props: {
  day: number;
  date: string;
  other: boolean;
  tasks: TaskDTO[];
  today: string;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const { day, date, other, tasks, today, selected, onSelect } = props;
  const done = tasks.filter((t) => t.completed).length;
  const priority = tasks.some((t) => t.isPriority && !t.completed);
  const cls = ["cal-cell"];
  if (other) cls.push("other");
  if (date === today) cls.push("today");
  if (date === selected) cls.push("selected");
  if (date < today && !other) cls.push("past");
  const rate = tasks.length ? done / tasks.length : 0;

  return (
    <button className={cls.join(" ")} onClick={() => onSelect(date)}>
      <span className="cal-num">{day}</span>
      {priority && <Zap className="cal-zap" />}
      <span className="cal-dots">
        {tasks.slice(0, 5).map((t) => (
          <i key={t.id} className={t.completed ? "done" : t.isPriority ? "priority" : ""} />
        ))}
      </span>
      {tasks.length > 0 && (
        <span className={`cal-summary ${rate === 1 ? "all" : ""}`}>
          {done}/{tasks.length}
        </span>
      )}
    </button>
  );
}

function DayComposer({ date }: { date: string }) {
  const { data, today, createTask } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!title.trim() || busy) return;
    if (date < today) return toast("Cannot add tasks to past dates", "error");
    if (time && date === today) {
      const now = new Date();
      if ((timeToMinutes(time) ?? 0) <= now.getHours() * 60 + now.getMinutes()) {
        return toast("Cannot schedule a past time for today", "error");
      }
    }
    setBusy(true);
    const created = await createTask({
      title: title.trim(),
      goalId: goalId || null,
      dueDate: date,
      startTime: time || null,
      isPriority: priority,
    });
    setBusy(false);
    if (created) {
      setTitle("");
      setPriority(false);
      toast(`Task added for ${fmtDateShort(date)}`, "success");
    }
  };

  return (
    <div className="composer">
      <input
        type="text"
        placeholder={`Add a task for ${fmtDateShort(date)}...`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
      />
      <div className="quick-options">
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">No goal</option>
          {data.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button
          type="button"
          className={`toggle-chip ${priority ? "on" : ""}`}
          onClick={() => setPriority((p) => !p)}
          aria-pressed={priority}
        >
          <Zap /> Main
        </button>
        <button className="btn btn-primary btn-sm" onClick={add} disabled={busy || !title.trim()}>
          <Plus /> Add
        </button>
      </div>
    </div>
  );
}

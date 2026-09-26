"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Circle, Gift, Pause, Play, Plus, Repeat, Smartphone, X, Zap } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { breakCategoriesFor, breakLabel, breakReady, customBreaksFor, isMidPhase, randomBreak } from "@/lib/client/breaks";
import type { BreakSuggestion } from "@/lib/client/breaks";
import { requestNotificationPermission } from "@/lib/client/sound";
import { fmtDate, fmtDateShort, timeToMinutes, youtubeId } from "@/lib/shared/logic";
import type { TaskDTO } from "@/lib/shared/types";

/** The task the timer is working on, if it still exists. */
export function useAttachedTask() {
  const { data } = useStore();
  const id = data.focus.attachedTaskId;
  return id ? (data.tasks.find((t) => t.id === id) ?? null) : null;
}

/**
 * The one big timer button:
 *  focus not started → pick a task (required) · paused part-way → resume · running → pause
 *  focus finished → pick a reward break · break paused → resume.
 */
export function usePrimaryFocus() {
  const { data, focusAction, setPicker, setMusicPlaying } = useStore();
  const task = useAttachedTask();
  const f = data.focus;
  const isWork = f.mode === "work";

  if (f.running) {
    return {
      label: "Pause",
      icon: Pause,
      run: async () => {
        await focusAction("pause");
        setMusicPlaying(false);
      },
    };
  }
  if (isWork && isMidPhase(f) && task) {
    return {
      label: "Resume",
      icon: Play,
      run: async () => {
        await focusAction("start");
        if (youtubeId(data.user.settings.youtubeUrl)) setMusicPlaying(true);
      },
    };
  }
  if (isWork) return { label: "Start focus", icon: Play, run: () => setPicker("task") };
  if (breakReady(f)) return { label: "Choose your break", icon: Gift, run: () => setPicker("break") };
  return { label: "Resume break", icon: Play, run: () => focusAction("start") };
}

/** Rendered once in the app shell; shows whichever focus pop-up is open. */
export default function FocusPickers() {
  const { picker, setPicker } = useStore();
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicker(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker, setPicker]);

  if (picker === "task" || picker === "switch") return <TaskPicker switching={picker === "switch"} />;
  if (picker === "break") return <BreakPicker />;
  return null;
}

// ------------------------------------------------------------------ task picker

function TaskPicker({ switching }: { switching: boolean }) {
  const { data, today, ui, setPicker, createTask, startFocus, attachTask, setMusicPlaying } = useStore();
  const attached = useAttachedTask();
  const [selected, setSelected] = useState<string | null>(attached && !attached.completed ? attached.id : null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const minutes = data.user.settings.pomoWork;

  const open = data.tasks.filter((t) => !t.completed);
  const byTime = (a: TaskDTO, b: TaskDTO) =>
    Number(b.isPriority) - Number(a.isPriority) ||
    (timeToMinutes(a.startTime) ?? 9999) - (timeToMinutes(b.startTime) ?? 9999);
  const todays = open.filter((t) => t.dueDate === today).sort(byTime);
  const overdue = open.filter((t) => t.dueDate !== null && t.dueDate < today);
  const queued = open.filter((t) => t.dueDate === null);
  const upcoming = open
    .filter((t) => t.dueDate !== null && t.dueDate > today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const go = async (taskId: string) => {
    setBusy(true);
    if (switching) {
      await attachTask(taskId);
    } else {
      requestNotificationPermission();
      const f = await startFocus(taskId);
      if (f?.running && youtubeId(data.user.settings.youtubeUrl)) setMusicPlaying(true);
    }
    setBusy(false);
    setPicker(null);
  };

  const addAndGo = async () => {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    const task = await createTask({ title: newTitle.trim(), goalId: ui.activeGoalId, dueDate: today });
    setBusy(false);
    if (task) await go(task.id);
  };

  const section = (title: string, list: TaskDTO[], sub?: (t: TaskDTO) => string) =>
    list.length > 0 && (
      <div className="pick-section">
        <div className="eyebrow">{title}</div>
        {list.slice(0, 30).map((t) => {
          const g = t.goalId ? data.goals.find((x) => x.id === t.goalId) : null;
          const meta = [g?.title, sub?.(t), t.startTime, t.pomodoroCount ? `${t.pomodoroCount} sessions` : null]
            .filter(Boolean)
            .join(" · ");
          const on = selected === t.id;
          return (
            <button
              key={t.id}
              className={`pick-tile ${on ? "on" : ""}`}
              onClick={() => setSelected(t.id)}
              onDoubleClick={() => go(t.id)}
              aria-pressed={on}
            >
              {on ? <CircleCheck className="pick-check" /> : <Circle className="pick-check" />}
              {g && <i className="goal-dot" style={{ background: g.color }} />}
              <span className="pick-body">
                <strong>{t.title}</strong>
                {meta && <small>{meta}</small>}
              </span>
              {t.isPriority && <Zap className="pick-zap" />}
            </button>
          );
        })}
      </div>
    );

  const empty = !todays.length && !overdue.length && !queued.length && !upcoming.length;

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPicker(null)}>
      <div className="modal modal-lg picker" role="dialog" aria-modal="true" aria-label="Choose a task to focus on">
        <div className="modal-head">
          <div>
            <h3>{switching ? "Switch task" : "What will you focus on?"}</h3>
            <p className="muted small">Pick one task for this {minutes}-minute session. One thing at a time.</p>
          </div>
          <button className="icon-btn" onClick={() => setPicker(null)} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="input-row">
          <input
            type="text"
            autoFocus={empty}
            placeholder="Or write a new task for today..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAndGo()}
          />
          <button className="btn btn-secondary" onClick={addAndGo} disabled={busy || !newTitle.trim()}>
            <Plus /> Add
          </button>
        </div>
        <div className="picker-list">
          {empty && <p className="muted small">No open tasks yet — write the one you want to work on above.</p>}
          {section("Today", todays)}
          {section("Overdue", overdue, (t) => fmtDateShort(t.dueDate!))}
          {section("Goal queue", queued, () => "In queue")}
          {section("Coming up", upcoming, (t) => fmtDate(t.dueDate!))}
        </div>
        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={!selected || busy}
          onClick={() => selected && go(selected)}
        >
          {switching ? (
            <>
              <Repeat /> Switch task
            </>
          ) : (
            <>
              <Play /> Start focus · {minutes} min
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ break picker

function BreakPicker() {
  const { data, setPicker, startBreak } = useStore();
  const f = data.focus;
  const st = data.user.settings;
  const changing = f.running;
  const [mode, setMode] = useState<"shortBreak" | "longBreak">(f.mode === "longBreak" ? "longBreak" : "shortBreak");
  const [screenFree, setScreenFree] = useState(false);

  // Focus is running (e.g. started on the phone meanwhile): nothing to pick.
  useEffect(() => {
    if (f.mode === "work") setPicker(null);
  }, [f.mode, setPicker]);
  if (f.mode === "work") return null;

  const mins = mode === "longBreak" ? st.pomoLongBreak : st.pomoShortBreak;
  const custom = customBreaksFor(st.customBreaks ?? [], mode);
  const keep = (b: BreakSuggestion) => !screenFree || !b.screen;

  const pick = async (activity: string | null) => {
    setPicker(null);
    await startBreak(changing ? (f.mode as "shortBreak" | "longBreak") : mode, activity);
  };

  const tile = (b: BreakSuggestion, i: number) => (
    <button key={`${b.title}-${i}`} className="break-tile" onClick={() => pick(breakLabel(b))}>
      <span className="break-emoji">{b.emoji}</span>
      <span>{b.title}</span>
      {b.screen && <Smartphone className="break-screen" aria-label="Uses a screen" />}
    </button>
  );

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPicker(null)}>
      <div className="modal modal-xl picker" role="dialog" aria-modal="true" aria-label="Pick your break reward">
        <div className="modal-head">
          <div>
            <h3>{changing ? "Change your reward" : "🎉 Focus done! Pick your reward"}</h3>
            <p className="muted small">
              {changing
                ? "Your break keeps its time — only the reward changes."
                : `You earned it. Choose what to do on your ${mins}-minute break.`}
            </p>
          </div>
          <button className="icon-btn" onClick={() => setPicker(null)} aria-label="Close">
            <X />
          </button>
        </div>

        {!changing && (
          <div className="break-lengths">
            {(
              [
                ["shortBreak", "Quick treat", st.pomoShortBreak],
                ["longBreak", "Bigger treat", st.pomoLongBreak],
              ] as const
            ).map(([m, label, minutes]) => (
              <button key={m} className={`break-length ${mode === m ? "on" : ""}`} onClick={() => setMode(m)}>
                <strong>{label}</strong>
                <span>
                  {minutes} min{f.mode === m ? " · suggested" : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => pick(breakLabel(randomBreak(mode, st.customBreaks ?? [], screenFree)))}>
            <Gift /> Surprise me
          </button>
          <button
            type="button"
            className={`toggle-chip toggle-chip-green ${screenFree ? "on" : ""}`}
            aria-pressed={screenFree}
            onClick={() => setScreenFree((v) => !v)}
          >
            Screen-free only
          </button>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => pick(null)}>
            Just rest
          </button>
        </div>

        <div className="picker-list">
          {custom.length > 0 && (
            <div className="pick-section">
              <div className="eyebrow">⭐ Your breaks</div>
              <div className="break-grid">{custom.filter(keep).map(tile)}</div>
            </div>
          )}
          {breakCategoriesFor(mode).map(
            (c) =>
              c.items.some(keep) && (
                <div className="pick-section" key={c.name}>
                  <div className="eyebrow">
                    {c.emoji} {c.name}
                  </div>
                  <div className="break-grid">{c.items.filter(keep).map(tile)}</div>
                </div>
              ),
          )}
          <p className="muted small">Add your own rewards in Settings → Break rewards.</p>
        </div>
      </div>
    </div>
  );
}

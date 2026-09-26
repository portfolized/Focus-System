"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Zap } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { useToast } from "@/lib/client/toast";
import { api } from "@/lib/client/api";
import { timeToMinutes, XP_REWARDS } from "@/lib/shared/logic";
import type { Eisenhower, TaskDTO } from "@/lib/shared/types";

interface DraftSub {
  id: string | null; // null = not saved yet
  key: string;
  title: string;
  completed: boolean;
}

const EIS: { value: Eisenhower; label: string; hint: string }[] = [
  { value: "do-first", label: "Do first", hint: "Urgent · important" },
  { value: "schedule", label: "Schedule", hint: "Important" },
  { value: "delegate", label: "Delegate", hint: "Urgent" },
  { value: "eliminate", label: "Eliminate", hint: "Neither" },
];

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function currentTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

/** Wrapper: mounts a fresh editor each time it opens. */
export default function TaskEditor() {
  const { editingTaskId, data } = useStore();
  if (editingTaskId === undefined) return null;
  const task = editingTaskId ? (data.tasks.find((t) => t.id === editingTaskId) ?? null) : null;
  return <EditorModal key={editingTaskId ?? "new"} task={task} />;
}

function EditorModal({ task: t }: { task: TaskDTO | null }) {
  const store = useStore();
  const { data, today, ui, closeTaskEditor, createTask, updateTask, deleteTask, refresh } = store;
  const toast = useToast();

  const [title, setTitle] = useState(t?.title ?? "");
  const [goalId, setGoalId] = useState(t ? (t.goalId ?? "") : (ui.activeGoalId ?? ""));
  const [description, setDescription] = useState(t?.description ?? "");
  // "" = the goal's queue (no date yet).
  const [dueDate, setDueDate] = useState(t ? (t.dueDate ?? "") : ui.selectedDate > today ? ui.selectedDate : today);
  const [startTime, setStartTime] = useState(t?.startTime ?? "");
  const [endTime, setEndTime] = useState(t?.endTime ?? "");
  const [eisenhower, setEisenhower] = useState<Eisenhower | null>(t?.eisenhower ?? null);
  const [isPriority, setIsPriority] = useState(t?.isPriority ?? false);
  const [subs, setSubs] = useState<DraftSub[]>(
    (t?.subtasks ?? []).map((s) => ({ id: s.id, key: s.id, title: s.title, completed: s.completed })),
  );
  const [newSub, setNewSub] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeTaskEditor();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTaskEditor]);

  const addSub = () => {
    if (!newSub.trim()) return;
    setSubs((s) => [...s, { id: null, key: crypto.randomUUID(), title: newSub.trim(), completed: false }]);
    setNewSub("");
  };

  const save = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return toast("Title is required", "error");
    const due = dueDate || null;
    const start = startTime || null;
    const scheduleChanged = !t || due !== t.dueDate || start !== t.startTime;
    if (scheduleChanged && due && due < today) return toast("Cannot schedule tasks in the past", "error");
    if (scheduleChanged && start && due === today && (timeToMinutes(start) ?? 0) <= nowMinutes()) {
      return toast("Cannot set a start time in the past for today", "error");
    }

    setSaving(true);
    const fields = {
      title: cleanTitle,
      goalId: goalId || null,
      description,
      dueDate: due,
      startTime: start,
      endTime: endTime || null,
      eisenhower,
      isPriority,
    };

    if (!t) {
      const created = await createTask({ ...fields, subtasks: subs.map((s) => ({ title: s.title })) });
      setSaving(false);
      if (created) closeTaskEditor();
      return;
    }

    const updated = await updateTask(t.id, fields);
    if (!updated) return setSaving(false);

    // Sync subtask edits made in the modal.
    try {
      const keep = new Set(subs.filter((s) => s.id).map((s) => s.id));
      const ops: Promise<unknown>[] = [];
      for (const s of t.subtasks) {
        if (!keep.has(s.id)) ops.push(api(`/api/tasks/${t.id}/subtasks/${s.id}`, { method: "DELETE" }));
      }
      for (const s of subs) {
        const orig = t.subtasks.find((o) => o.id === s.id);
        if (orig && orig.title !== s.title && s.title.trim()) {
          ops.push(api(`/api/tasks/${t.id}/subtasks/${s.id}`, { method: "PATCH", body: { title: s.title.trim() } }));
        }
      }
      await Promise.all(ops);
      for (const s of subs.filter((x) => !x.id)) {
        await api(`/api/tasks/${t.id}/subtasks`, { method: "POST", body: { title: s.title } });
      }
      if (ops.length || subs.some((s) => !s.id)) await refresh();
    } catch {
      toast("Some subtask changes could not be saved", "error");
    }
    setSaving(false);
    closeTaskEditor();
  };

  const remove = async () => {
    if (!t) return;
    if (await deleteTask(t.id)) closeTaskEditor();
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && closeTaskEditor()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label={t ? "Edit task" : "New task"}>
        <div className="modal-head">
          <h3>{t ? "Edit task" : "New task"}</h3>
          <button className="icon-btn" onClick={closeTaskEditor} aria-label="Close">
            <X />
          </button>
        </div>
        <input
          className="title-input"
          type="text"
          autoFocus
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <div className="field">
          <label>Notes</label>
          <textarea rows={2} placeholder="Optional details" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Goal</label>
            <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {data.goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Due date {dueDate === "" && <em className="muted">· in queue, no date</em>}</label>
            <div className="input-row">
              <input type="date" value={dueDate} min={today} onChange={(e) => setDueDate(e.target.value)} />
              <button
                type="button"
                className={`toggle-chip ${dueDate === today ? "on" : ""}`}
                onClick={() => setDueDate(today)}
              >
                Today
              </button>
              <button
                type="button"
                className={`toggle-chip toggle-chip-teal ${dueDate === "" ? "on" : ""}`}
                onClick={() => setDueDate("")}
                title="No date — keep it in the goal's queue"
              >
                Queue
              </button>
            </div>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Start time</label>
            <input
              type="time"
              value={startTime}
              min={dueDate === today ? currentTimeStr() : undefined}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="field">
            <label>End time</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Priority matrix</label>
          <div className="eis-picker">
            {EIS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`eis m-${o.value} ${eisenhower === o.value ? "on" : ""}`}
                onClick={() => setEisenhower((cur) => (cur === o.value ? null : o.value))}
              >
                <strong>{o.label}</strong>
                <span>{o.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`toggle-card ${isPriority ? "on" : ""}`}
          onClick={() => setIsPriority((p) => !p)}
          aria-pressed={isPriority}
        >
          <Zap />
          <div>
            <strong>Main task of the day</strong>
            <span>Your one most important task · worth +{XP_REWARDS.priorityTask} XP instead of +{XP_REWARDS.task}</span>
          </div>
        </button>
        <div className="field">
          <label>Subtasks</label>
          <div className="sub-edit">
            {subs.map((s) => (
              <div key={s.key} className="input-row">
                <input
                  type="text"
                  value={s.title}
                  onChange={(e) =>
                    setSubs((all) => all.map((x) => (x.key === s.key ? { ...x, title: e.target.value } : x)))
                  }
                />
                <button
                  className="icon-btn"
                  onClick={() => setSubs((all) => all.filter((x) => x.key !== s.key))}
                  aria-label="Remove subtask"
                >
                  <X />
                </button>
              </div>
            ))}
            <div className="input-row">
              <input
                type="text"
                placeholder="Add a subtask and press Enter"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSub()}
              />
              <button className="icon-btn bordered" onClick={addSub} aria-label="Add subtask">
                <Plus />
              </button>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          {t && (
            <button className="btn btn-ghost danger-text" onClick={remove}>
              <Trash2 /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-secondary" onClick={closeTaskEditor}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {t ? "Save changes" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, ListChecks, Pencil, Play, Plus, Timer, Trash2, X, Zap } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { EISENHOWER_LABELS, XP_REWARDS } from "@/lib/shared/logic";
import type { TaskDTO } from "@/lib/shared/types";

export default function TaskCard({ task: t, showDate = false }: { task: TaskDTO; showDate?: boolean }) {
  const {
    data,
    today,
    toggleComplete,
    toggleFrog,
    deleteTask,
    openTaskEditor,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    attachTask,
  } = useStore();
  const router = useRouter();
  const [newSub, setNewSub] = useState("");
  const [expanded, setExpanded] = useState(false);

  const goal = t.goalId ? data.goals.find((g) => g.id === t.goalId) : null;
  const doneSubs = t.subtasks.filter((s) => s.completed).length;
  const reward = t.isPriority ? XP_REWARDS.priorityTask : XP_REWARDS.task;
  const focused = data.focus.attachedTaskId === t.id;
  const showSubs = expanded || (t.subtasks.length > 0 && t.subtasks.length <= 3 && !t.completed);

  const submitSub = async () => {
    if (!newSub.trim()) return;
    const title = newSub;
    setNewSub("");
    await addSubtask(t.id, title);
  };

  const focusOn = async () => {
    if (!focused) await attachTask(t.id);
    router.push("/focus");
  };

  return (
    <div
      className={`task ${t.completed ? "done" : ""} ${t.isPriority && !t.completed ? "priority" : ""} ${focused && !t.completed ? "focused" : ""}`}
      style={goal ? ({ "--goal": goal.color } as React.CSSProperties) : undefined}
      data-task-id={t.id}
    >
      <button
        className={`check ${t.completed ? "on" : ""}`}
        role="checkbox"
        aria-checked={t.completed}
        aria-label={t.completed ? "Mark as not done" : "Mark as done"}
        onClick={() => toggleComplete(t.id)}
      >
        <Check />
      </button>

      <div className="task-body">
        <div className="task-title-row">
          <button className="task-title" onClick={() => openTaskEditor(t.id)}>
            {t.title}
          </button>
          {!t.completed && <span className="xp-pill">+{reward} XP</span>}
        </div>
        {t.description && !t.completed && <p className="task-desc">{t.description}</p>}
        <div className="task-meta">
          {t.isPriority && !t.completed && (
            <span className="tag tag-priority">
              <Zap /> Main task
            </span>
          )}
          {goal && (
            <span className="tag tag-goal">
              <i style={{ background: goal.color }} />
              {goal.title}
            </span>
          )}
          {showDate && t.dueDate !== today && <span className="tag">{t.dueDate}</span>}
          {t.eisenhower && <span className={`tag tag-${t.eisenhower}`}>{EISENHOWER_LABELS[t.eisenhower]}</span>}
          {t.startTime && (
            <span className="meta">
              <Clock /> {t.startTime}
              {t.endTime ? `–${t.endTime}` : ""}
            </span>
          )}
          {t.pomodoroCount > 0 && (
            <span className="meta" title="Focus sessions on this task">
              <Timer /> {t.pomodoroCount}
            </span>
          )}
          <button className="meta meta-btn" onClick={() => setExpanded((e) => !e)} aria-expanded={showSubs}>
            <ListChecks />
            {t.subtasks.length ? `${doneSubs}/${t.subtasks.length}` : "Subtasks"}
            <ChevronDown className={showSubs ? "flip" : ""} />
          </button>
        </div>

        {showSubs && (
          <div className="subtasks">
            {t.subtasks.map((s) => (
              <div className="subtask" key={s.id}>
                <button
                  className={`check check-sm ${s.completed ? "on" : ""}`}
                  aria-label={s.completed ? "Mark subtask as not done" : "Mark subtask as done"}
                  onClick={() => updateSubtask(t.id, s.id, { completed: !s.completed })}
                >
                  <Check />
                </button>
                <span className={s.completed ? "struck" : ""}>{s.title}</span>
                <button className="icon-btn icon-btn-xs" onClick={() => deleteSubtask(t.id, s.id)} aria-label="Delete subtask">
                  <X />
                </button>
              </div>
            ))}
            <div className="subtask-add">
              <Plus />
              <input
                type="text"
                placeholder="Add a subtask (+5 XP)"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSub()}
              />
            </div>
          </div>
        )}
      </div>

      <div className="task-actions">
        {!t.completed && (
          <button className="icon-btn focus-btn" onClick={focusOn} title="Focus on this task">
            <Play />
          </button>
        )}
        {!t.completed && (
          <button
            className={`icon-btn ${t.isPriority ? "is-priority" : ""}`}
            onClick={() => toggleFrog(t.id)}
            title={t.isPriority ? "Unset main task" : "Make this the main task (+50 XP)"}
          >
            <Zap />
          </button>
        )}
        <button className="icon-btn" onClick={() => openTaskEditor(t.id)} title="Edit">
          <Pencil />
        </button>
        <button className="icon-btn danger" onClick={() => deleteTask(t.id)} title="Delete">
          <Trash2 />
        </button>
      </div>
    </div>
  );
}

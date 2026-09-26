import type { TaskDTO } from "@/lib/shared/types";
import { toDateStr } from "@/lib/shared/logic";

/** A goal's tasks split the way you think about them. [goalId] null = tasks without a goal. */
export interface GoalTasks {
  queue: TaskDTO[];
  planned: TaskDTO[];
  done: TaskDTO[];
  total: number;
  sessions: number;
}

export function goalTasks(tasks: TaskDTO[], goalId: string | null): GoalTasks {
  const mine = tasks.filter((t) => t.goalId === goalId);
  const done = mine
    .filter((t) => t.completed)
    .sort((a, b) => (b.completedAt ?? b.dueDate ?? "").localeCompare(a.completedAt ?? a.dueDate ?? ""));
  const queue = mine.filter((t) => !t.completed && t.dueDate === null);
  const planned = mine
    .filter((t) => !t.completed && t.dueDate !== null)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  return {
    queue,
    planned,
    done,
    total: mine.length,
    sessions: mine.reduce((n, t) => n + t.pomodoroCount, 0),
  };
}

/** Local day a task was completed (falls back to its due date). */
export function doneOn(t: TaskDTO): string | null {
  if (!t.completedAt) return t.dueDate;
  return toDateStr(new Date(t.completedAt));
}

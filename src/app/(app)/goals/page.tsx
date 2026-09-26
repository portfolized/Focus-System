"use client";

import Link from "next/link";
import { ChevronRight, CircleDashed, Goal, Inbox, Plus } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { goalTasks, type GoalTasks } from "@/lib/client/goals";
import type { GoalDTO } from "@/lib/shared/types";

/** Every goal with what is done, queued and planned for it. */
export default function GoalsPage() {
  const { data, createGoal } = useStore();
  const standalone = goalTasks(data.tasks, null);

  return (
    <div className="page">
      <section className="card hero-card goals-hero">
        <div>
          <div className="eyebrow">Goals</div>
          <h1>What you have done, and what is next</h1>
          <p className="muted">
            Open a goal to see its finished tasks and a queue of ideas. Queue tasks have no date — send one to today
            or any day when you are ready.
          </p>
        </div>
        <button className="btn btn-primary" onClick={createGoal}>
          <Plus /> New goal
        </button>
      </section>

      {data.goals.length === 0 ? (
        <div className="empty">
          <Goal />
          <h4>No goals yet</h4>
          <p>Create a goal, then fill its queue with the tasks that move it forward.</p>
        </div>
      ) : (
        <div className="goal-grid">
          {data.goals.map((g) => (
            <GoalCard key={g.id} goal={g} tasks={goalTasks(data.tasks, g.id)} />
          ))}
          {standalone.total > 0 && <GoalCard goal={null} tasks={standalone} />}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, tasks }: { goal: GoalDTO | null; tasks: GoalTasks }) {
  const color = goal?.color ?? "var(--text-2)";
  const pct = tasks.total ? Math.round((tasks.done.length / tasks.total) * 100) : 0;
  return (
    <Link
      href={`/goals/${goal?.id ?? "none"}`}
      className="card goal-card"
      style={{ "--goal": color } as React.CSSProperties}
    >
      <div className="goal-card-head">
        <span className="goal-icon">{goal ? <Goal /> : <Inbox />}</span>
        <div>
          <h3>{goal?.title ?? "No goal"}</h3>
          <span className="muted small">
            {tasks.done.length} done · {tasks.queue.length} in queue · {tasks.planned.length} planned
          </span>
        </div>
        <ChevronRight className="goal-chevron" />
      </div>
      <div className="bar bar-sm goal-bar-progress">
        <i style={{ width: `${pct}%` }} />
      </div>
      {tasks.queue.length > 0 && (
        <div className="goal-next">
          <div className="eyebrow">Up next in queue</div>
          {tasks.queue.slice(0, 3).map((t) => (
            <span key={t.id}>
              <CircleDashed /> {t.title}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

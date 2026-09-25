"use client";

import { useRef, useState } from "react";
import {
  Brain,
  Coffee,
  Flame,
  Maximize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Sofa,
  Square,
  Timer,
} from "lucide-react";
import YoutubeFrame from "@/components/YoutubeFrame";
import { tasksForDate, useStore, type FocusMode } from "@/lib/client/store";
import { useTimer } from "@/lib/client/timer";
import { useToast } from "@/lib/client/toast";
import { requestNotificationPermission } from "@/lib/client/sound";
import { fmtClock, focusModeLabel, XP_REWARDS, youtubeId } from "@/lib/shared/logic";
import type { UserSettings } from "@/lib/shared/types";

const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MODES: { mode: FocusMode; label: string; icon: typeof Brain }[] = [
  { mode: "work", label: "Focus", icon: Brain },
  { mode: "shortBreak", label: "Short break", icon: Coffee },
  { mode: "longBreak", label: "Long break", icon: Sofa },
];

export default function FocusPage() {
  const { data, today, focusAction, setFocusMode, attachTask, updateSettings, overlayOpen, setOverlayOpen, musicPlaying, setMusicPlaying } =
    useStore();
  const { secondsLeft, progress } = useTimer();
  const toast = useToast();
  const focus = data.focus;
  const settings = data.user.settings;
  const [url, setUrl] = useState(settings.youtubeUrl);
  const [syncedUrl, setSyncedUrl] = useState(settings.youtubeUrl);
  if (syncedUrl !== settings.youtubeUrl) {
    // Saved elsewhere (e.g. the app): adopt the new value.
    setSyncedUrl(settings.youtubeUrl);
    setUrl(settings.youtubeUrl);
  }

  const openTasks = tasksForDate(data.tasks, today).filter((t) => !t.completed);
  const attached = focus.attachedTaskId ? data.tasks.find((t) => t.id === focus.attachedTaskId) : null;
  const options = attached && !openTasks.includes(attached) ? [attached, ...openTasks] : openTasks;
  const logs = data.pomoLogs.filter((l) => l.date === today);
  const sessionsToday = logs.reduce((s, l) => s + (l.sessions || 1), 0);
  const minutesToday = logs.reduce((s, l) => s + (l.minutes || (l.sessions || 1) * settings.pomoWork), 0);
  const isWork = focus.mode === "work";

  // Where we are in the cycle of work sessions before a long break.
  const interval = settings.pomoLongInterval;
  const doneInCycle = focus.sessionCount % interval;
  const nextIsLong = isWork && (focus.sessionCount + 1) % interval === 0;
  const nextLabel = isWork
    ? nextIsLong
      ? `Long break · ${settings.pomoLongBreak} min`
      : `Short break · ${settings.pomoShortBreak} min`
    : `Focus · ${settings.pomoWork} min`;

  const saveMusic = async (silent = false) => {
    const clean = url.trim();
    if (clean && !youtubeId(clean)) {
      toast("Paste a valid YouTube link", "error");
      return false;
    }
    if (clean !== settings.youtubeUrl) {
      if (!(await updateSettings({ youtubeUrl: clean }))) return false;
    }
    if (!silent) toast("Music saved", "success");
    return true;
  };

  const playMusic = async () => {
    if ((await saveMusic(true)) && youtubeId(url)) setMusicPlaying(true);
  };

  const start = async () => {
    requestNotificationPermission();
    await focusAction("start");
    if (youtubeId(settings.youtubeUrl)) setMusicPlaying(true);
  };
  const pause = async () => {
    await focusAction("pause");
    setMusicPlaying(false);
  };
  const reset = async () => {
    await focusAction("reset");
    setMusicPlaying(false);
  };

  return (
    <div className="page focus-page">
      <section className={`card focus-main ${isWork ? "" : "break"} ${focus.running ? "running" : ""}`}>
        <div className="segmented" role="tablist" aria-label="Timer mode">
          {MODES.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              role="tab"
              aria-selected={focus.mode === mode}
              className={focus.mode === mode ? "active" : ""}
              onClick={() => focus.mode !== mode && setFocusMode(mode)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="timer">
          <svg viewBox="0 0 260 260" aria-hidden="true">
            <defs>
              <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isWork ? "var(--primary)" : "var(--teal)"} />
                <stop offset="100%" stopColor={isWork ? "var(--pink)" : "var(--success)"} />
              </linearGradient>
            </defs>
            <circle className="timer-track" cx="130" cy="130" r={RADIUS} />
            <circle
              className="timer-progress"
              cx="130"
              cy="130"
              r={RADIUS}
              stroke="url(#timer-grad)"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <div className="timer-center">
            <span className="timer-mode">{focusModeLabel(focus.mode)}</span>
            <strong id="timer-display">{fmtClock(secondsLeft)}</strong>
            <span className="timer-sub">{isWork ? `+${XP_REWARDS.focusSession} XP on finish` : "Rest your eyes"}</span>
          </div>
        </div>

        <label className="attach">
          <span>Working on</span>
          <select
            id="focus-task-select"
            value={focus.attachedTaskId ?? ""}
            onChange={(e) => attachTask(e.target.value || null)}
          >
            <option value="">No task (free focus)</option>
            {options.map((t) => {
              const g = t.goalId ? data.goals.find((x) => x.id === t.goalId) : null;
              return (
                <option key={t.id} value={t.id}>
                  {t.isPriority ? "⚡ " : ""}
                  {t.title}
                  {g ? ` · ${g.title}` : ""}
                </option>
              );
            })}
          </select>
        </label>

        <div className="timer-controls">
          <button className="round-btn" onClick={reset} title="Reset" aria-label="Reset">
            <RotateCcw />
          </button>
          {focus.running ? (
            <button className="round-btn round-btn-lg" onClick={pause} title="Pause" aria-label="Pause">
              <Pause />
            </button>
          ) : (
            <button className="round-btn round-btn-lg" onClick={start} title="Start" aria-label="Start">
              <Play />
            </button>
          )}
          <button
            className="round-btn"
            onClick={() => focusAction("skip")}
            title={isWork ? "Skip is available during breaks" : "Skip break"}
            aria-label="Skip break"
            disabled={isWork}
          >
            <SkipForward />
          </button>
        </div>

        <div className="cycle">
          <div className="cycle-dots" title={`${doneInCycle} of ${interval} sessions until a long break`}>
            {Array.from({ length: interval }, (_, i) => (
              <i key={i} className={i < doneInCycle ? "done" : i === doneInCycle && isWork ? "current" : ""} />
            ))}
          </div>
          <span>
            <Coffee /> Next: {nextLabel}
          </span>
        </div>

        <button className="btn btn-ghost" onClick={() => setOverlayOpen(true)}>
          <Maximize2 /> Fullscreen focus
        </button>
      </section>

      <div className="focus-side">
        <div className="card">
          <div className="card-head">
            <h3>
              <Flame /> Today
            </h3>
          </div>
          <div className="mini-stats">
            <div>
              <strong>{sessionsToday}</strong>
              <span>sessions</span>
            </div>
            <div>
              <strong>{minutesToday}</strong>
              <span>minutes</span>
            </div>
            <div>
              <strong>{sessionsToday * XP_REWARDS.focusSession}</strong>
              <span>focus XP</span>
            </div>
          </div>
          <div className="focus-log">
            {logs.length ? (
              logs
                .slice(-6)
                .reverse()
                .map((l) => {
                  const t = l.taskId ? data.tasks.find((x) => x.id === l.taskId) : null;
                  return (
                    <div className="focus-log-row" key={l.id}>
                      <span>{t ? t.title : "Free focus"}</span>
                      <em>
                        {l.sessions || 1} <Timer />
                      </em>
                    </div>
                  );
                })
            ) : (
              <p className="muted small">No sessions yet today. Press play to start your first one.</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>
              <Music /> Focus music
            </h3>
            <label className="switch-label">
              <input
                type="checkbox"
                className="switch"
                checked={settings.alarmEnabled}
                onChange={(e) => updateSettings({ alarmEnabled: e.target.checked })}
              />
              Alarm
            </label>
          </div>
          <div className="input-row">
            <input
              type="url"
              placeholder="Paste a YouTube link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveMusic()}
            />
            <button className="btn btn-sm btn-secondary" onClick={() => saveMusic()}>
              Save
            </button>
          </div>
          <div className="btn-row">
            <button className="btn btn-sm btn-secondary" onClick={playMusic}>
              <Play /> Play
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setMusicPlaying(false)}>
              <Square /> Stop
            </button>
          </div>
          <div className="video-wrap">
            {/* The overlay plays its own copy; pause this one while it is open. */}
            <YoutubeFrame url={settings.youtubeUrl} autoplay={musicPlaying && !overlayOpen} />
          </div>
        </div>

        <details className="card timer-settings">
          <summary>
            <Settings2 /> Timer lengths
            <span className="muted small">
              {settings.pomoWork} / {settings.pomoShortBreak} / {settings.pomoLongBreak} min
            </span>
          </summary>
          <SettingRow label="Focus (min)" field="pomoWork" max={120} />
          <SettingRow label="Short break (min)" field="pomoShortBreak" max={60} />
          <SettingRow label="Long break (min)" field="pomoLongBreak" max={60} />
          <SettingRow label="Sessions before long break" field="pomoLongInterval" max={10} />
        </details>
      </div>
    </div>
  );
}

type NumericSetting = "pomoWork" | "pomoShortBreak" | "pomoLongBreak" | "pomoLongInterval";

/** Number input that saves shortly after the user stops typing/stepping. */
function SettingRow({ label, field, max }: { label: string; field: NumericSetting; max: number }) {
  const { data, updateSettings } = useStore();
  const saved = data.user.settings[field];
  const [value, setValue] = useState(String(saved));
  const [synced, setSynced] = useState(saved);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (synced !== saved) {
    setSynced(saved);
    setValue(String(saved));
  }

  const commit = (raw: string) => {
    const v = parseInt(raw, 10);
    if (isNaN(v) || v < 1 || v > max || v === saved) return;
    updateSettings({ [field]: v } as Partial<UserSettings>);
  };

  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={1}
        max={max}
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          const raw = e.target.value;
          timer.current = setTimeout(() => commit(raw), 600);
        }}
        onBlur={(e) => commit(e.target.value)}
      />
    </label>
  );
}

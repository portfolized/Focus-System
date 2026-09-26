"use client";

import { Pause, Play, X } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { usePrimaryFocus } from "./FocusPickers";
import { useTimer } from "@/lib/client/timer";
import { fmtClock, focusModeLabel } from "@/lib/shared/logic";
import YoutubeFrame from "./YoutubeFrame";

export default function FocusOverlay() {
  const { data, overlayOpen, setOverlayOpen } = useStore();
  const { secondsLeft, progress } = useTimer();
  const primary = usePrimaryFocus();
  if (!overlayOpen) return null;

  const task = data.focus.attachedTaskId ? data.tasks.find((t) => t.id === data.focus.attachedTaskId) : null;
  const url = data.user.settings.youtubeUrl;
  const isWork = data.focus.mode === "work";

  return (
    <div
      className={`focus-overlay ${isWork ? "" : "break"}`}
      onClick={(e) => e.target === e.currentTarget && setOverlayOpen(false)}
    >
      <button className="icon-btn overlay-exit" onClick={() => setOverlayOpen(false)} aria-label="Exit focus mode">
        <X />
      </button>
      <div className="overlay-label">{focusModeLabel(data.focus.mode)}</div>
      <div className="overlay-timer">{fmtClock(secondsLeft)}</div>
      <div className="overlay-bar">
        <i style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="overlay-task">
        {isWork ? (task ? task.title : "Deep work") : (data.focus.breakActivity ?? "Break time")}
      </div>
      <button className="round-btn round-btn-lg" onClick={primary.run} aria-label={primary.label} title={primary.label}>
        {data.focus.running ? <Pause /> : <Play />}
      </button>
      {url && (
        <div className="overlay-music">
          <YoutubeFrame url={url} autoplay />
        </div>
      )}
    </div>
  );
}

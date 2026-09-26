"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { api } from "./api";
import { useNow } from "./clock";
import { useStore } from "./store";
import { useToast } from "./toast";
import { notify, playAlarm, playChime } from "./sound";
import { breakReady } from "./breaks";
import { fmtClock, focusModeLabel } from "@/lib/shared/logic";
import type { FocusDTO, XpEvent } from "@/lib/shared/types";

interface TimerValue {
  secondsLeft: number;
  progress: number;
}

const TimerContext = createContext<TimerValue>({ secondsLeft: 0, progress: 0 });
export const useTimer = () => useContext(TimerContext);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { data, serverOffset, applyFocus, handleEvents, setPicker } = useStore();
  const toast = useToast();
  const focus = data.focus;
  const now = useNow(250, focus.running);
  const pending = useRef(false);
  const lastAdvance = useRef(0);

  const secondsLeft =
    focus.running && focus.endsAt && now !== null
      ? Math.max(0, Math.ceil((focus.endsAt - (now + serverOffset)) / 1000))
      : focus.secondsLeft;

  // Phase finished: ask the server to advance it (it logs the session + XP).
  useEffect(() => {
    if (!focus.running || secondsLeft > 0 || pending.current) return;
    if (Date.now() - lastAdvance.current < 3000) return;
    pending.current = true;
    lastAdvance.current = Date.now();
    api<{ focus: FocusDTO; events: XpEvent[]; serverTime: number }>("/api/focus")
      .then((res) => {
        applyFocus(res.focus, res.serverTime);
        handleEvents(res.events);
      })
      .catch(() => {})
      .finally(() => {
        pending.current = false;
      });
  }, [secondsLeft, focus, applyFocus, handleEvents]);

  // A running phase ended (here, or on the phone): ring, then ask for the next step.
  // Phases don't run into each other: focus → pick a reward break, break → pick the next task.
  const prev = useRef(focus);
  useEffect(() => {
    const before = prev.current;
    prev.current = focus;
    if (!before.running || focus.running || focus.version === before.version) return;
    const alarm = data.user.settings.alarmEnabled;
    if (before.mode === "work" && breakReady(focus)) {
      if (alarm) playAlarm();
      else playChime();
      notify("Focus session complete 🎉", "Your reward break is unlocked — pick one.");
      toast("Focus session complete! Pick your reward 🎁", "success");
      setPicker("break");
    } else if (before.mode !== "work" && focus.mode === "work") {
      if (alarm) playAlarm();
      else playChime();
      notify("Break over ☕", "Pick a task and start your next focus session.");
      toast("Break over! Ready to focus.", "info");
    }
  }, [focus, data.user.settings.alarmEnabled, toast, setPicker]);

  // Show the countdown in the browser tab while running.
  useEffect(() => {
    document.title = focus.running
      ? `${fmtClock(secondsLeft)} · ${focusModeLabel(focus.mode)} — Focus System`
      : breakReady(focus)
        ? "🎁 Pick your break — Focus System"
        : "Focus System";
  }, [focus, secondsLeft]);

  const progress = focus.totalSeconds > 0 ? (focus.totalSeconds - secondsLeft) / focus.totalSeconds : 0;
  const value = useMemo(() => ({ secondsLeft, progress }), [secondsLeft, progress]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

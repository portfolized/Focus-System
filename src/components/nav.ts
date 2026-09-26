import { BarChart3, Goal, Sun, Timer, Trophy } from "lucide-react";

export const NAV = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/rewards", label: "Rewards", icon: Trophy },
] as const;

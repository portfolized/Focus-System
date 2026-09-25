import { BarChart3, Calendar, Sun, Timer, Trophy } from "lucide-react";

export const NAV = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/rewards", label: "Rewards", icon: Trophy },
] as const;

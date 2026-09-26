// Break rewards: things to do after a finished focus session (same list as the app's lib/breaks.dart).
// "short" = quick treats for the short break, "long" = bigger treats for the long break.
import type { BreakIdea, FocusDTO, FocusMode } from "@/lib/shared/types";

export interface BreakSuggestion {
  emoji: string;
  title: string;
  /** Uses a phone / screen, so screen-free breaks are easy to pick. */
  screen?: boolean;
}

export interface BreakCategory {
  emoji: string;
  name: string;
  items: BreakSuggestion[];
}

export const breakLabel = (b: BreakSuggestion) => `${b.emoji} ${b.title}`;

const s = (emoji: string, title: string, screen = false): BreakSuggestion => ({ emoji, title, screen });

export const SHORT_BREAKS: BreakCategory[] = [
  {
    emoji: "🍫",
    name: "Treat yourself",
    items: [
      s("🍫", "Eat one piece of your favourite chocolate, slowly, like a fancy dessert"),
      s("🍋", "Make a fancy drink: water with lemon, honey or ice, or a quick milk tea"),
      s("🥄", "A spoonful of something you love: peanut butter, Nutella or ice cream"),
    ],
  },
  {
    emoji: "🎵",
    name: "Music & vibes",
    items: [
      s("🎤", "Blast your favourite song and sing like you are on stage"),
      s("💃", "One-song dance party in your room"),
      s("📻", "Play a song you have not heard in years", true),
    ],
  },
  {
    emoji: "🤸",
    name: "Move & wake up",
    items: [
      s("💪", "20 jumping jacks, then flex in the mirror"),
      s("🦩", "Balance on one leg with your eyes closed"),
      s("🧦", "Silly challenge: juggle socks or touch your nose with your tongue"),
    ],
  },
  {
    emoji: "😌",
    name: "Screen-free chill",
    items: [
      s("🌤️", "Step outside and feel the sun or wind on your face"),
      s("🦵", "Lie on the floor with your legs up the wall"),
      s("🫧", "Blow bubbles or play with a stress ball or fidget toy"),
    ],
  },
  {
    emoji: "🎨",
    name: "Quick & creative",
    items: [
      s("✏️", "Draw a funny doodle of how you feel right now"),
      s("✈️", "Make a paper plane and see how far it flies"),
      s("📝", "Write a ridiculous one-line story"),
    ],
  },
  {
    emoji: "💬",
    name: "Social & cute",
    items: [
      s("😂", "Send a funny meme or sticker to a friend", true),
      s("🐶", "Cuddle or play with your pet"),
      s("🎙️", 'Voice-note a friend a random "guess what?"', true),
    ],
  },
  {
    emoji: "📱",
    name: "Fun screen time",
    items: [
      s("🤣", "Watch 2–3 funny short videos (set a timer!)", true),
      s("🦖", "One round of Wordle, 2048 or Chrome Dino", true),
    ],
  },
];

export const LONG_BREAKS: BreakCategory[] = [
  {
    emoji: "🍜",
    name: "Food adventures",
    items: [
      s("🥟", "Cook or order your favourite snack (momo, chowmein, pani puri, noodles) — no guilt"),
      s("🧁", "Make a fancy dessert: mug cake, milkshake or a fruit bowl with toppings"),
      s("😋", "Tasting session: try a snack you have never tried before"),
    ],
  },
  {
    emoji: "🎬",
    name: "Fun screen time",
    items: [
      s("📺", "Watch one episode of a sitcom or cartoon you love", true),
      s("🎮", "Play your favourite video or mobile game (set an alarm!)", true),
      s("🎭", "Watch a funny YouTube video or stand-up clip", true),
    ],
  },
  {
    emoji: "🚶",
    name: "Get outside",
    items: [
      s("🍦", "Walk to grab your favourite street snack or drink"),
      s("☁️", "Go to the rooftop or balcony and watch the sky, clouds or birds"),
      s("📸", "Take a walk and photograph random cool things"),
    ],
  },
  {
    emoji: "🎨",
    name: "Creative play",
    items: [
      s("🖌️", "Draw, paint or colour something just for fun"),
      s("🎸", "Play an instrument or learn a new song"),
      s("🧱", "Build something with Lego, clay or origami"),
    ],
  },
  {
    emoji: "🕺",
    name: "Move your body",
    items: [
      s("🪩", "Full dance party with 4–5 favourite songs"),
      s("🏸", "Quick sport: badminton, football or table tennis"),
      s("🎧", "Follow a fun dance workout video", true),
    ],
  },
  {
    emoji: "😴",
    name: "Pure relaxation",
    items: [
      s("🛌", "Cozy power nap under a blanket"),
      s("🚿", "Warm shower with good music playing"),
      s("📚", "Read a comic, manga or fun novel"),
    ],
  },
  {
    emoji: "💬",
    name: "Social fun",
    items: [
      s("📞", "Call your best friend — talk about anything except work", true),
      s("🎲", "Board game, cards or ludo with family or roommates"),
    ],
  },
];

export const breakCategoriesFor = (mode: FocusMode) => (mode === "longBreak" ? LONG_BREAKS : SHORT_BREAKS);

/** Your own breaks from Settings for this break length. */
export const customBreaksFor = (ideas: BreakIdea[], mode: FocusMode): BreakSuggestion[] =>
  ideas
    .filter((b) => (b.length === "long") === (mode === "longBreak"))
    .map((b) => ({ emoji: b.emoji || "🎁", title: b.title }));

/** "Surprise me": like pulling a slip out of the reward jar. */
export function randomBreak(mode: FocusMode, custom: BreakIdea[], screenFree = false) {
  const pool = [...customBreaksFor(custom, mode), ...breakCategoriesFor(mode).flatMap((c) => c.items)].filter(
    (b) => !screenFree || !b.screen,
  );
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------- timer state helpers (mirror the app's FocusState getters) ----------

/** Paused part-way through a phase (not a fresh one). */
export const isMidPhase = (f: FocusDTO) => !f.running && f.secondsLeft < f.totalSeconds;

/** A focus session just finished: the break is unlocked and waits for a reward to be picked. */
export const breakReady = (f: FocusDTO) => f.mode !== "work" && !f.running && f.secondsLeft >= f.totalSeconds;

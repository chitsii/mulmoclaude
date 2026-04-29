// Theme switching composable. Three states:
//   - "auto"  : follow OS `prefers-color-scheme` (default)
//   - "light" : force light (override OS)
//   - "dark"  : force dark (override OS)
//
// State is persisted to localStorage. The `theme-dark` class on
// <html> is the one source of truth that all dark-mode CSS targets.
//
// Initial application happens in index.html via an inline boot script
// (so there's no flash-of-light while Vue mounts). This composable
// wires runtime updates: when the user clicks the toggle button the
// class is updated immediately, and when in `auto` mode the OS
// theme change media query is observed.
//
// The state is module-level (not per-component instance) so every
// `useTheme()` call shares the same refs — good for a singleton UI
// preference.

import { ref, computed, watch, type Ref, type ComputedRef } from "vue";

const STORAGE_KEY = "mulmoclaude-theme";

export type Theme = "auto" | "light" | "dark";

function loadInitialTheme(): Theme {
  if (typeof localStorage === "undefined") return "auto";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "auto";
}

function osPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const themeRef: Ref<Theme> = ref(loadInitialTheme());
const osDarkRef: Ref<boolean> = ref(osPrefersDark());

const effectiveDarkRef: ComputedRef<boolean> = computed(() => {
  if (themeRef.value === "dark") return true;
  if (themeRef.value === "light") return false;
  return osDarkRef.value;
});

// Sync the html.theme-dark class with effectiveDark. Runs immediately
// on first import too — but the inline boot script in index.html has
// already set the class correctly, so this is a no-op on first frame.
watch(
  effectiveDarkRef,
  (dark) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("theme-dark", dark);
  },
  { immediate: true },
);

// Persist explicit choices; clear localStorage when returning to auto.
watch(themeRef, (newTheme) => {
  if (typeof localStorage === "undefined") return;
  if (newTheme === "auto") {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, newTheme);
  }
});

// Track OS dark-mode changes so `auto` reacts in real time. Installed
// once (idempotent guard) the first time anyone calls `useTheme()`.
let osListenerInstalled = false;
function ensureOsListener(): void {
  if (osListenerInstalled || typeof window === "undefined") return;
  osListenerInstalled = true;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", (event) => {
    osDarkRef.value = event.matches;
  });
}

export function useTheme(): {
  theme: Ref<Theme>;
  effectiveDark: ComputedRef<boolean>;
  cycle: () => void;
} {
  ensureOsListener();
  function cycle(): void {
    themeRef.value = themeRef.value === "auto" ? "dark" : themeRef.value === "dark" ? "light" : "auto";
  }
  return { theme: themeRef, effectiveDark: effectiveDarkRef, cycle };
}

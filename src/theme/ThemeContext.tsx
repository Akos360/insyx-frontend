import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { ThemeContext, type Theme, type ThemePreference } from "./theme-context";

const STORAGE_KEY = "app-theme";

function readStoredPreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(readStoredPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = themePreference === "system" ? (systemDark ? "dark" : "light") : themePreference;

  useEffect(() => {
    if (themePreference === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", themePreference);
    window.localStorage.setItem(STORAGE_KEY, themePreference);
  }, [themePreference]);

  const value = useMemo(
    () => ({
      theme,
      themePreference,
      setThemePreference,
      toggleTheme: () => setThemePreference(theme === "dark" ? "light" : "dark"),
    }),
    [theme, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

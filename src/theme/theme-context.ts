import { createContext } from "react";

export type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

export type ThemeContextValue = {
  /** Resolved theme actually applied (system preference resolved to dark/light). */
  theme: Theme;
  /** The stored preference, including "system". Drives the Settings control. */
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  /** Binary flip between dark/light, used by the landing page's toggle. */
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

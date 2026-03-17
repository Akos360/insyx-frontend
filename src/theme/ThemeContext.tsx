import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { ThemeContext, type Theme } from "./theme-context";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = window.localStorage.getItem("app-theme");
    return storedTheme === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    window.localStorage.setItem("app-theme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

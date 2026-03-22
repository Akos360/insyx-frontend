import { useTheme } from "../theme/useTheme";
import "./theme-toggle.css";

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      className={compact ? "themeToggle themeToggleCompact" : "themeToggle"}
      onClick={toggleTheme}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      <span className="themeToggleTrack" aria-hidden="true">
        <span className={isLight ? "themeToggleThumb themeToggleThumbLight" : "themeToggleThumb"} />
      </span>
    </button>
  );
}

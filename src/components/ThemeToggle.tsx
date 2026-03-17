import { useTheme } from "../theme/useTheme";
import { BsMoonStarsFill, BsSunFill } from "react-icons/bs";
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
        <span className="themeToggleIcons">
          <BsMoonStarsFill className={isLight ? "themeToggleIcon themeToggleIconInactive" : "themeToggleIcon themeToggleIconDark"} />
          <BsSunFill className={isLight ? "themeToggleIcon themeToggleIconLight" : "themeToggleIcon themeToggleIconInactive"} />
        </span>
        <span className={isLight ? "themeToggleThumb themeToggleThumbLight" : "themeToggleThumb"} />
      </span>
      <span className="themeToggleLabel">{isLight ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}

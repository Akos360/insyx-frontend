import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import { useTheme } from "../../theme/useTheme";
import type { ThemePreference } from "../../theme/theme-context";
import "./settings.css";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof LuSun }> = [
  { value: "dark", label: "Dark", icon: LuMoon },
  { value: "light", label: "Light", icon: LuSun },
  { value: "system", label: "System", icon: LuMonitor },
];

export default function SettingsPage() {
  const { themePreference, setThemePreference } = useTheme();

  return (
    <main className="settingsPage">
      <div className="settingsHeader">
        <p className="settingsEyebrow">Settings</p>
        <h1 className="settingsTitle">Preferences</h1>
      </div>

      <section className="uiCard settingsCard">
        <div className="uiCardHead">
          <div className="uiCardTitle">
            <span>Appearance</span>
          </div>
        </div>
        <div className="settingsSection">
          <p className="settingsSectionDesc">Choose how Insyx looks on this device.</p>
          <div className="uiSeg" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={themePreference === option.value}
                className={"uiSegBtn" + (themePreference === option.value ? " uiSegOn" : "")}
                onClick={() => setThemePreference(option.value)}
              >
                <option.icon aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

import { useNavigate } from "react-router-dom";
import "./settings.css";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <main className="settingsPage">
      <section className="settingsCard">
        <div className="settingsHeader">
          <p className="settingsEyebrow">Settings</p>
          <h1 className="settingsTitle">Account Preferences</h1>
        </div>

        <form className="settingsForm">
          <label className="settingsField">
            <span className="settingsFieldLabel">Name</span>
            <input type="text" className="settingsInput" defaultValue="User Name" />
          </label>

          <label className="settingsField">
            <span className="settingsFieldLabel">Email</span>
            <input type="email" className="settingsInput" defaultValue="user@example.com" />
          </label>

          <label className="settingsField">
            <span className="settingsFieldLabel">Password</span>
            <input type="password" className="settingsInput" placeholder="Change password" />
          </label>
        </form>

        <div className="settingsFooter">
          <button type="submit" className="settingsSaveButton">
            Save
          </button>
          <button type="button" className="settingsLogoutButton" onClick={() => navigate("/")}>
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}

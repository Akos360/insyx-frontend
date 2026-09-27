import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuUser } from "react-icons/lu";
import { useAuth } from "../../auth/useAuth";
import "./account.css";

function initialsFor(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Something went wrong. Please try again.";
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [affiliation, setAffiliation] = useState(user?.affiliation ?? "");
  const [detailsSubmitting, setDetailsSubmitting] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDetailsError(null);
    setDetailsSuccess(null);
    setDetailsSubmitting(true);
    try {
      await updateProfile({ name, email, affiliation });
      setDetailsSuccess("Changes saved.");
    } catch (err) {
      setDetailsError(extractErrorMessage(err));
    } finally {
      setDetailsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess("Password changed.");
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (!user) return null;

  return (
    <main className="accountPage">
      <div className="accountHeader">
        <p className="accountEyebrow">Account</p>
        <h1 className="accountTitle">Profile</h1>
      </div>

      <section className="uiCard accountCard">
        <div className="uiCardHead">
          <div className="uiCardTitle">
            <LuUser aria-hidden="true" />
            <span>Personal details</span>
          </div>
        </div>
        <form className="accountForm" onSubmit={handleDetailsSubmit}>
          <div className="accountPhotoRow">
            <span className="accountPhoto">{initialsFor(user.name, user.email)}</span>
            <p className="accountPhotoHelp">Photo uploads aren't supported yet — your initials are shown instead.</p>
          </div>

          <label className="accountField">
            <span className="accountFieldLabel">Name</span>
            <input className="uiInput" value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="accountField">
            <span className="accountFieldLabel">Email</span>
            <input
              className="uiInput"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="accountField">
            <span className="accountFieldLabel">Affiliation</span>
            <input
              className="uiInput"
              value={affiliation}
              onChange={(event) => setAffiliation(event.target.value)}
              placeholder="University or organization"
            />
          </label>

          {detailsError ? <p className="accountError">{detailsError}</p> : null}
          {detailsSuccess ? <p className="accountSuccess">{detailsSuccess}</p> : null}

          <div className="accountFormFooter">
            <button type="submit" className="uiBtn uiBtnPrimary" disabled={detailsSubmitting}>
              {detailsSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </section>

      <section className="uiCard accountCard">
        <div className="uiCardHead">
          <div className="uiCardTitle">
            <span>Password</span>
          </div>
        </div>
        <form className="accountForm" onSubmit={handlePasswordSubmit}>
          <label className="accountField">
            <span className="accountFieldLabel">Current password</span>
            <input
              className="uiInput"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          <label className="accountField">
            <span className="accountFieldLabel">New password</span>
            <input
              className="uiInput"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={10}
              autoComplete="new-password"
            />
          </label>

          <label className="accountField">
            <span className="accountFieldLabel">Confirm new password</span>
            <input
              className="uiInput"
              type="password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {passwordError ? <p className="accountError">{passwordError}</p> : null}
          {passwordSuccess ? <p className="accountSuccess">{passwordSuccess}</p> : null}

          <div className="accountFormFooter">
            <button type="submit" className="uiBtn uiBtnPrimary" disabled={passwordSubmitting || !newPassword}>
              {passwordSubmitting ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </section>

      <section className="uiCard accountCard">
        <div className="uiCardHead">
          <div className="uiCardTitle">
            <span>Sessions and account</span>
          </div>
        </div>
        <div className="accountForm">
          <div className="accountActionRow">
            <div>
              <p className="accountActionTitle">Log out</p>
              <p className="accountActionHelp">End your session on this device.</p>
            </div>
            <button type="button" className="uiBtn uiBtnSecondary" onClick={handleLogout}>
              Log out
            </button>
          </div>

          <div className="accountActionRow">
            <div>
              <p className="accountActionTitle">Log out of all devices</p>
              <p className="accountActionHelp">Coming soon — needs session tracking on the backend.</p>
            </div>
            <button type="button" className="uiBtn uiBtnSecondary" disabled>
              Log out everywhere
            </button>
          </div>

          <div className="accountActionRow">
            <div>
              <p className="accountActionTitle">Delete account</p>
              <p className="accountActionHelp">Coming soon — permanently deletes your account and data.</p>
            </div>
            <button type="button" className="uiBtn uiBtnDanger" disabled>
              Delete account
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

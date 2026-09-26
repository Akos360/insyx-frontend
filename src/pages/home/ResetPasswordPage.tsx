import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import LiquidGlass from "liquid-glass-react";
import { useAuth } from "../../auth/useAuth";
import ThemeToggle from "../../components/layout/ThemeToggle";
import "./home.css";

const HeroGradient = lazy(() => import("./HeroGradient"));

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      navigate("/explore");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        "This reset link is invalid or has expired.";
      setError(Array.isArray(message) ? message.join(" ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="homePage">
      <Suspense fallback={null}>
        <HeroGradient />
      </Suspense>
      <div className="homeHeroScrim" aria-hidden="true" />

      <section className="homeHero">
        <div className="homeHeroContent">
          <p className="homeEyebrow">OpenAlex-powered bibliometrics</p>
          <h1 className="homeTitle">Insyx: explore research in three dimensions</h1>
          <p className="homeDescription">
            Search papers, trace author and institution profiles, and watch global research
            activity unfold on a live 3D globe — all from OpenAlex's open scholarly dataset,
            in one continuous session.
          </p>
        </div>

        <div className="homeThemeToggleWrap">
          <ThemeToggle compact />
        </div>
      </section>

      <aside className="homePanel">
        <LiquidGlass
          className="homePanelCard homePanelCardFixedReset"
          style={{ position: "absolute", top: "50%", left: "50%" }}
          cornerRadius={20}
          padding="28px"
          blurAmount={0.18}
          saturation={130}
          aberrationIntensity={1}
          elasticity={0}
          mode="standard"
        >
          <p className="homePanelLabel">Reset password</p>
          <h2 className="homeFormTitle">Choose a new password</h2>

          {!token ? (
            <>
              <p className="homeError">This reset link is missing its token.</p>
              <p className="homeSwitchText">
                <Link to="/forgot-password" className="homeSwitchButton">Request a new link</Link>
              </p>
            </>
          ) : (
            <form className="homeForm" onSubmit={handleSubmit}>
              <label className="homeField">
                <span className="homeFieldLabel">New password</span>
                <input
                  type="password"
                  className="homeInput"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={10}
                  required
                />
              </label>

              <label className="homeField">
                <span className="homeFieldLabel">Confirm new password</span>
                <input
                  type="password"
                  className="homeInput"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>

              {error ? (
                <>
                  <p className="homeError">{error}</p>
                  <p className="homeSwitchText">
                    <Link to="/forgot-password" className="homeSwitchButton">Request a new link</Link>
                  </p>
                </>
              ) : null}

              <button type="submit" className="homeCta" disabled={submitting}>
                {submitting ? "Please wait…" : "Reset password"}
              </button>
            </form>
          )}
        </LiquidGlass>
      </aside>
    </main>
  );
}

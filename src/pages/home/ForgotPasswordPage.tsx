import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import LiquidGlass from "liquid-glass-react";
import { forgotPassword } from "../../api/auth";
import ThemeToggle from "../../components/layout/ThemeToggle";
import "./home.css";

const HeroGradient = lazy(() => import("./HeroGradient"));

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never fill this
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email, website);
      // The backend itself returns this identical response whether or not
      // the email is registered — no enumeration happens here. This only
      // shows the confirmation for an actual successful request; a real
      // failure (network error, rate limit, 500) surfaces as an error
      // instead of a false "sent" message.
      setSubmitted(true);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        "Something went wrong. Please try again.";
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
          className="homePanelCard homePanelCardFixedForgot"
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
          <h2 className="homeFormTitle">Forgot your password?</h2>

          {submitted ? (
            <>
              <p className="homeDescription" style={{ margin: "0 0 22px" }}>
                If that email is registered, a reset link has been sent.
              </p>
              <p className="homeSwitchText">
                <Link to="/" className="homeSwitchButton">Back to login</Link>
              </p>
            </>
          ) : (
            <form className="homeForm" onSubmit={handleSubmit}>
              <label className="homeField">
                <span className="homeFieldLabel">Email</span>
                <input
                  type="email"
                  name="email"
                  className="homeInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="homeHoneypot" aria-hidden="true">
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>

              {error ? <p className="homeError">{error}</p> : null}

              <button type="submit" className="homeCta" disabled={submitting}>
                {submitting ? "Please wait…" : "Send reset link"}
              </button>

              <p className="homeSwitchText">
                <Link to="/" className="homeSwitchButton">Back to login</Link>
              </p>
            </form>
          )}
        </LiquidGlass>
      </aside>
    </main>
  );
}

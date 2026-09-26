import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidGlass from "liquid-glass-react";
import ThemeToggle from "../../components/layout/ThemeToggle";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import { useAuth } from "../../auth/useAuth";
import "./home.css";

const HeroGradient = lazy(() => import("./HeroGradient"));

export default function HomePage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never fill this
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const credentials = { email, password, website };
      if (isRegister) await register(credentials);
      else await login(credentials);
      navigate("/explore");
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
          className="homePanelCard homePanelCardFixed"
          style={{ position: "absolute", top: "50%", left: "50%" }}
          cornerRadius={20}
          padding="28px"
          blurAmount={0.18}
          saturation={130}
          aberrationIntensity={1}
          elasticity={0}
          mode="standard"
        >
          <p className="homePanelLabel">{isRegister ? "Register" : "Login"}</p>
          <h2 className="homeFormTitle">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

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

            <label className="homeField">
              <span className="homeFieldLabel">
                Password
                {isRegister ? null : (
                  <Link to="/forgot-password" className="homeForgotLink">Forgot password?</Link>
                )}
              </span>
              <input
                type="password"
                name="password"
                className="homeInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isRegister ? 10 : undefined}
                required
              />
            </label>

            {isRegister ? (
              <label className="homeField">
                <span className="homeFieldLabel">Confirm Password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  className="homeInput"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
            ) : null}

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
              {submitting ? "Please wait…" : isRegister ? "Register" : "Login"}
            </button>
          </form>

          <div className="homeDivider">
            <span>or continue with</span>
          </div>
          <GoogleSignInButton onError={setError} />

          <p className="homeSwitchText">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="homeSwitchButton"
              onClick={() => {
                setMode(isRegister ? "login" : "register");
                setError(null);
              }}
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </p>
        </LiquidGlass>
      </aside>
    </main>
  );
}

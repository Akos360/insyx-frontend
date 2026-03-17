import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./home.css";

export default function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const isRegister = mode === "register";

  return (
    <main className="homePage">
      <section className="homeHero">
        <div className="homeHeroContent">
          <p className="homeEyebrow">Insyx Explorer</p>
          <h1 className="homeTitle">Insyx Science-of-Science Explorer</h1>
          <p className="homeDescription">
            Interactive web application for exploring bibliometric and scientometric data:
            citation networks, collaboration structures, metadata panels, and linked views.
          </p>
        </div>

        <div className="homeThemeToggleWrap">
          <ThemeToggle compact />
        </div>
      </section>

      <aside className="homePanel">
        <div className="homePanelCard">
          <p className="homePanelLabel">{isRegister ? "Register" : "Login"}</p>
          <h2 className="homeFormTitle">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          <form
            className="homeForm"
            onSubmit={(event) => {
              event.preventDefault();
              navigate("/explore");
            }}
          >
            {isRegister ? (
              <label className="homeField">
                <span className="homeFieldLabel">Name</span>
                <input type="text" name="name" className="homeInput" />
              </label>
            ) : null}

            <label className="homeField">
              <span className="homeFieldLabel">Email</span>
              <input type="email" name="email" className="homeInput" />
            </label>

            <label className="homeField">
              <span className="homeFieldLabel">Password</span>
              <input type="password" name="password" className="homeInput" />
            </label>

            {isRegister ? (
              <label className="homeField">
                <span className="homeFieldLabel">Confirm Password</span>
                <input type="password" name="confirmPassword" className="homeInput" />
              </label>
            ) : null}

            <button type="submit" className="homeCta">
              {isRegister ? "Register" : "Login"}
            </button>
          </form>

          <p className="homeSwitchText">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="homeSwitchButton"
              onClick={() => setMode(isRegister ? "login" : "register")}
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </p>
        </div>
      </aside>
    </main>
  );
}

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useTheme } from "../../theme/useTheme";
import "./google-sign-in-button.css";

// Minimal shape of the Google Identity Services API this component actually
// uses — the full API surface isn't published as an npm types package.
type GoogleCredentialResponse = { credential: string };
type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme: "outline" | "filled_black";
          size: "large";
          shape: "rectangular";
          text: "continue_with";
          width: number;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

type GoogleSignInButtonProps = {
  onError?: (message: string) => void;
};

// Only mounted on HomePage — the script is loaded on demand, not app-wide,
// matching the lazy-loading approach already used for HeroGradient/GlobePage.
export default function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  const { theme } = useTheme();
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
          callback: (response) => {
            loginWithGoogle(response.credential)
              .then(() => navigate("/explore"))
              .catch(() => onError?.("Google sign-in failed. Please try again."));
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: theme === "light" ? "outline" : "filled_black",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: 260,
        });
      })
      .catch(() => onError?.("Couldn't load Google sign-in."));

    return () => {
      cancelled = true;
    };
  }, [theme, loginWithGoogle, navigate, onError]);

  return <div ref={buttonRef} className="googleSignInButton" />;
}

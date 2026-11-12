import { Component, type ErrorInfo, type ReactNode } from "react";
import "./error-boundary.css";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * A render error anywhere in the tree with no boundary above it white-screens
 * the whole app with no way back except a manual URL edit/reload. This is
 * the one, top-level catch-all — page-specific error states (a failed
 * fetch, "not found") should keep handling themselves inline as before.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] caught a render error:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="errorBoundaryPage">
        <h1 className="errorBoundaryTitle">Something went wrong</h1>
        <p className="errorBoundaryText">
          This page hit an unexpected error. You can try again, or head back to the Overview.
        </p>
        <div className="errorBoundaryActions">
          <button type="button" className="uiBtn uiBtnSecondary" onClick={this.reset}>
            Try again
          </button>
          {/* A plain <a>, not a router Link — the error may have come from
              inside the router's own tree, so a hard navigation is the one
              recovery path guaranteed not to depend on it still working. */}
          <a href="/explore" className="uiBtn uiBtnPrimary">
            Back to Overview
          </a>
        </div>
      </main>
    );
  }
}

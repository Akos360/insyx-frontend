import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function Boom(): never {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("catches a render error and shows the fallback instead of white-screening", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("'Try again' re-renders the children instead of staying stuck on the fallback forever", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error("kaboom");
      return <div>recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));
    rerender(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("recovered")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

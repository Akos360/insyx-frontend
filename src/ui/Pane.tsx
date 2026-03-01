import { useCallback, useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

import "./pane.css";

type Props = PropsWithChildren<{
  title: string;
  isMaximized: boolean;
  onMaximize: () => void;
  onRestore: () => void;
}>;

export default function Pane({ title, children, isMaximized, onMaximize, onRestore }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const requestFullscreen = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRestore();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [onRestore]);

  return (
    <div ref={ref} className="pane">
      <div className="paneHeader">
        <div className="paneTitle">{title}</div>

        <div className="paneActions">
          {!isMaximized ? (
            <button className="btn" onClick={onMaximize} title="Maximize inside app">
              Maximize
            </button>
          ) : (
            <button className="btn" onClick={onRestore} title="Restore grid">
              Restore
            </button>
          )}

          <button className="btn" onClick={requestFullscreen} title="Browser fullscreen">
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className="paneBody">{children}</div>
    </div>
  );
}

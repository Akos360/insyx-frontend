import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LuX } from "react-icons/lu";
import ChartSelectionContent from "./ChartSelectionContent";
import type { ChartSelection } from "../../charts/chartSelection";
import "./ChartSelectionToast.css";

type Props = {
  selection: ChartSelection | null;
  onClose: () => void;
};

/** Floating bottom-right toast — used on the GraphPage grid, where a
 * selection isn't anchored to any one fixed panel. */
export default function ChartSelectionToast({ selection, onClose }: Props) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // Click anywhere outside the toast closes it; a click that opened it (on
  // the chart itself) fires before this effect re-runs, so it's never
  // immediately self-closed.
  useEffect(() => {
    if (!selection) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selection, onClose]);

  if (!selection) return null;

  function openFullView() {
    if (!selection) return;
    if (selection.kind === "work") {
      navigate(`/paper/${selection.workId}`);
    } else {
      navigate(`/search?${new URLSearchParams(selection.searchParams)}`);
    }
  }

  return (
    <div className="chartSelToast" ref={ref} role="dialog" aria-label="Chart selection">
      <button className="chartSelToastClose" onClick={onClose} aria-label="Close">
        <LuX size={13} />
      </button>
      <ChartSelectionContent selection={selection} onOpenFullView={openFullView} />
    </div>
  );
}

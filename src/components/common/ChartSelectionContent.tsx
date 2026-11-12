import { useQuery } from "@tanstack/react-query";
import { LuExternalLink } from "react-icons/lu";
import { getWork } from "../../api/works";
import type { ChartSelection } from "../../charts/chartSelection";
import "./ChartSelectionContent.css";

type Props = {
  selection: ChartSelection;
  onOpenFullView: () => void;
};

/** The title/meta/button content shared by the floating toast (GraphPage grid)
 * and the inline sidebar panel (SingleChartPage) — only the shell differs. */
export default function ChartSelectionContent({ selection, onOpenFullView }: Props) {
  const workId = selection.kind === "work" ? selection.workId : undefined;
  const { data: work } = useQuery({
    queryKey: ["works", "detail", workId],
    queryFn: () => getWork(workId!),
    enabled: !!workId,
  });

  return (
    <>
      {selection.kind === "work" ? (
        <>
          <div className="chartSelTitle">{work?.title ?? "Loading…"}</div>
          {work && (
            <div className="chartSelMeta">
              {work.publication_year}
              {work.cited_by_count != null && <> · {work.cited_by_count.toLocaleString()} citations</>}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="chartSelTitle">{selection.label}</div>
          {selection.count != null && (
            <div className="chartSelMeta">{selection.count.toLocaleString()} works</div>
          )}
        </>
      )}

      <button className="chartSelAction" onClick={onOpenFullView}>
        <LuExternalLink size={13} />
        <span>Open in Full View</span>
      </button>
    </>
  );
}

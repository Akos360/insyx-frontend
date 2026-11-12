import "./Skeletons.css";

/** One shimmer row shaped like `.authorsCard` (flag + name + badge) — authors/institutions lists. */
export function AuthorRowSkeleton() {
  return (
    <div className="authorsCard skelRow" aria-hidden="true">
      <span className="authorsFlag"><span className="uiSkel skelCircle" /></span>
      <div className="authorsCardBody">
        <span className="uiSkel" style={{ height: 14, width: "55%" }} />
      </div>
      <div className="authorsCardMeta">
        <span className="uiSkel" style={{ height: 20, width: 72, borderRadius: 999 }} />
        <span className="uiSkel" style={{ height: 20, width: 58, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/** One shimmer row shaped like `.authorPaperItem` (year/field tags, title, source line) — works lists. */
export function WorkRowSkeleton() {
  return (
    <div className="authorPaperItem skelRow" aria-hidden="true">
      <div className="authorPaperMeta">
        <span className="uiSkel" style={{ height: 11, width: 32 }} />
        <span className="uiSkel" style={{ height: 16, width: 84, borderRadius: 10 }} />
      </div>
      <span className="uiSkel" style={{ height: 14, width: "78%", marginTop: 6, display: "block" }} />
      <span className="uiSkel" style={{ height: 11, width: "42%", marginTop: 8, display: "block" }} />
    </div>
  );
}

/** Bar-chart-shaped placeholder — fills its container, for chart panels/pages. */
export function ChartSkeleton() {
  const heights = [38, 62, 48, 80, 34, 58, 44, 70, 52];
  return (
    <div className="chartSkeleton" aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className="uiSkel chartSkeletonBar" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

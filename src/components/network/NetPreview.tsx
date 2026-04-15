import "./NetPreview.css";
import { useTheme } from "../../theme/useTheme";

const DARK_COLORS = [
  "#cbf7ed", "#8ea8c3", "#9db5ca", "#406e8e",
  "#6aaccc", "#4a7fa8", "#23395b", "#b8ddef",
];

const LIGHT_COLORS = [
  "#23395b", "#406e8e", "#8ea8c3", "#23395b",
  "#4a7fa8", "#406e8e", "#9db5ca", "#23395b",
];

const NODE_DEFS = [
  { id: 0,  x: 210, y: 148, r: 13, ci: 0 },
  { id: 1,  x: 168, y: 112, r: 10, ci: 1 },
  { id: 2,  x: 255, y: 118, r: 9,  ci: 2 },
  { id: 3,  x: 185, y: 185, r: 9,  ci: 3 },
  { id: 4,  x: 312, y: 140, r: 11, ci: 4 },
  { id: 5,  x: 135, y: 165, r: 8,  ci: 1 },
  { id: 6,  x: 232, y: 200, r: 7,  ci: 5 },
  { id: 7,  x: 80,  y: 130, r: 6,  ci: 2 },
  { id: 8,  x: 60,  y: 162, r: 5,  ci: 3 },
  { id: 9,  x: 95,  y: 196, r: 5,  ci: 1 },
  { id: 10, x: 55,  y: 100, r: 4,  ci: 4 },
  { id: 11, x: 40,  y: 177, r: 4,  ci: 6 },
  { id: 12, x: 108, y: 222, r: 5,  ci: 5 },
  { id: 13, x: 70,  y: 242, r: 3,  ci: 2 },
  { id: 14, x: 45,  y: 212, r: 3,  ci: 7 },
  { id: 15, x: 280, y: 78,  r: 5,  ci: 0 },
  { id: 16, x: 332, y: 88,  r: 4,  ci: 4 },
  { id: 17, x: 357, y: 157, r: 4,  ci: 6 },
  { id: 18, x: 342, y: 202, r: 4,  ci: 3 },
  { id: 19, x: 272, y: 232, r: 4,  ci: 5 },
  { id: 20, x: 217, y: 257, r: 4,  ci: 1 },
  { id: 21, x: 157, y: 242, r: 3,  ci: 2 },
  { id: 22, x: 145, y: 73,  r: 4,  ci: 4 },
  { id: 23, x: 200, y: 58,  r: 4,  ci: 0 },
  { id: 24, x: 252, y: 53,  r: 3,  ci: 5 },
  { id: 25, x: 30,  y: 80,  r: 3,  ci: 3 },
  { id: 26, x: 377, y: 112, r: 2,  ci: 6 },
  { id: 27, x: 372, y: 232, r: 2,  ci: 4 },
  { id: 28, x: 302, y: 267, r: 3,  ci: 1 },
  { id: 29, x: 117, y: 46,  r: 2,  ci: 2 },
  { id: 30, x: 20,  y: 142, r: 2,  ci: 7 },
  { id: 31, x: 392, y: 172, r: 2,  ci: 6 },
  { id: 32, x: 177, y: 28,  r: 2,  ci: 5 },
  { id: 33, x: 312, y: 36,  r: 2,  ci: 3 },
];

const edges = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
  [1,2],[1,5],[1,7],[1,22],[1,23],
  [2,4],[2,15],[2,16],[2,24],
  [3,5],[3,6],[3,12],[3,21],
  [4,16],[4,17],[4,18],[4,26],
  [5,7],[5,8],[5,9],
  [6,19],[6,20],[6,21],
  [7,8],[7,9],[7,10],[7,11],[7,25],
  [8,9],[8,11],[8,13],[8,14],
  [9,12],[9,13],
  [10,25],[10,29],
  [11,14],[11,30],
  [12,13],[12,21],
  [15,16],[15,24],[15,33],
  [16,17],[16,26],
  [17,18],[17,27],[17,31],
  [18,19],[18,27],[18,28],
  [19,20],[19,28],
  [20,21],[20,28],
  [22,23],[22,29],
  [23,24],[23,32],
  [0,15],[0,22],[1,29],[2,33],[3,20],[4,31],[5,30],[6,28],
  [7,1],[8,3],[10,22],[12,9],[15,2],[16,26],[17,4],[18,27],
];

export default function NetPreview() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const C = isLight ? LIGHT_COLORS : DARK_COLORS;
  const bg0 = isLight ? "#edf5fb" : "#111b28";
  const bg1 = isLight ? "#f7fbff" : "#071018";

  const nodes = NODE_DEFS.map((n) => ({ ...n, color: C[n.ci] }));

  return (
    <>
      <svg
        viewBox="0 0 400 290"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="netBg" cx="45%" cy="50%" r="75%">
            <stop offset="0%"   stopColor={bg0} />
            <stop offset="100%" stopColor={bg1} />
          </radialGradient>
        </defs>

        <rect width="400" height="290" fill="url(#netBg)" />

        <g>
          {edges.map(([a, b], i) => {
            const na = nodes[a], nb = nodes[b];
            return (
              <line
                key={i}
                className="netEdge"
                x1={na.x} y1={na.y}
                x2={nb.x} y2={nb.y}
                stroke={na.color}
                strokeWidth={Math.max(0.5, (na.r + nb.r) * 0.08)}
                style={{ animationDelay: `${(i * 0.11) % 4}s` }}
              />
            );
          })}
        </g>

        <g>
          {nodes.map((n) => (
            <circle
              key={n.id}
              className="netNode"
              cx={n.x} cy={n.y} r={n.r}
              fill={n.color}
              fillOpacity={isLight ? 0.7 : 0.82}
              stroke={n.color}
              strokeWidth={0.8}
              strokeOpacity={0.4}
              style={{ animationDelay: `${(n.id * 0.23) % 3.4}s` }}
            />
          ))}
        </g>
      </svg>

      <div className="netPreviewLabel">
        <div className="netPreviewDots">
          <span /><span /><span />
        </div>
        Loading network
      </div>
    </>
  );
}
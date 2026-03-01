import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Science-of-Science Explorer</h1>
      <p style={{ marginTop: 0, lineHeight: 1.5 }}>
        Interactive web application for exploring bibliometric and scientometric data:
        citation networks, collaboration structures, metadata panels, and linked views.
      </p>

      <h2 style={{ marginTop: 24 }}>Quick start</h2>
      <ol style={{ lineHeight: 1.7 }}>
        <li>Open the Explorer workspace.</li>
        <li>Select a paper/entity and inspect details in the side panels.</li>
        <li>Use filters and linked highlighting to navigate relationships.</li>
        <li>Maximize a pane for focused analysis or enter browser fullscreen.</li>
      </ol>

      <div >
        <Link
          to="/explore"
          style={{
            display: "inline-block",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #ccc",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Start Exploring →
        </Link>
      </div>
    </div>
  );
}

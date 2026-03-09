import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="container-fluid text-center" style={{ margin:0 , padding:0 }}>
      <div className="row min-vh-100" style={{ margin:0, display: "fluid" }}>
        <div className="col-md-8 d-flex flex-column justify-content-center align-items-center text-center" style={{background: "#9849e8", padding:0 }}>
          <h1 style={{ margin: 0 }}>Insyx Science-of-Science Explorer</h1>
          <p>
            Interactive web application for exploring bibliometric and scientometric data:
            citation networks, collaboration structures, metadata panels, and linked views.
          </p>
        </div>
        <div className="col-md-4 justify-content-center d-flex flex-column align-items-center" style={{background: "#ffffff", padding:0 }}>
          <Link
            to="/explore"
            style={{
              height: 50 ,
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
    </div>
  );
}

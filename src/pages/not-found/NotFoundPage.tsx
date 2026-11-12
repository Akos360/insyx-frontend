import { Link } from "react-router-dom";
import "./not-found-page.css";

export default function NotFoundPage() {
  return (
    <main className="notFoundPage">
      <p className="notFoundCode">404</p>
      <h1 className="notFoundTitle">Page not found</h1>
      <p className="notFoundText">There's nothing at this address.</p>
      <Link to="/explore" className="uiBtn uiBtnPrimary">
        Back to Overview
      </Link>
    </main>
  );
}

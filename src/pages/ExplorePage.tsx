import { useEffect, useState } from "react";
import { getPaper, type Paper } from "../api/papers";
import "./explore.css";

export default function ExplorePage() {
  const [data, setData] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPaper = () => {
    setLoading(true);
    setError(null);
    getPaper("p1")
      .then((paper) => setData(paper))
      .catch((err) => {
        setError(err?.message ?? "Failed to fetch paper");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPaper();
  }, []);

  if (loading) return <p>Loading paper from backend...</p>;

  if (error) {
    return (
      <div>
        <p>Connection failed: {error}</p>
        <button onClick={loadPaper}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Frontend connected to backend</h2>
      <p>
        Loaded paper <strong>{data?.id}</strong> from <code>GET /papers/p1</code>
      </p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

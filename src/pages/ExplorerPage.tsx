import { useQuery } from "@tanstack/react-query";
import { fetchPaper, fetchNeighborhood } from "../api/papers";

export default function ExplorerPage() {
  const paperId = "p1";

  const paperQ = useQuery({
    queryKey: ["paper", paperId],
    queryFn: () => fetchPaper(paperId),
  });

  const graphQ = useQuery({
    queryKey: ["neighborhood", paperId, 200],
    queryFn: () => fetchNeighborhood(paperId, 200),
  });

  return (
    <div style={{ padding: 16 }}>
      <h1>Explorer</h1>

      <h2>Paper</h2>
      <pre>{JSON.stringify(paperQ.data, null, 2)}</pre>

      <h2>Neighborhood</h2>
      <pre>{JSON.stringify(graphQ.data, null, 2)}</pre>
    </div>
  );
}

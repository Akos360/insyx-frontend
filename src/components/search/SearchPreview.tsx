import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import { getAllPapers, type Paper } from "../../api/papers";
import "./SearchPreview.css";

export default function SearchPreview() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getAllPapers().then(setPapers).catch(() => {});
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return papers;
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authors?.toLowerCase().includes(q) ||
        p.field?.toLowerCase().includes(q)
    );
  }, [papers, query]);

  return (
    <div className="searchPreview">
      <div className="searchPreviewBar">
        <div className="searchPreviewInputWrap">
          <BsSearch className="searchPreviewInputIcon" />
          <input
            className="searchPreviewInput"
            type="text"
            placeholder="Search title, author, field…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="searchPreviewTableWrap">
        <table className="searchPreviewTable">
          <thead>
            <tr>
              <th className="searchPreviewTh searchPreviewThTitle">Title</th>
              <th className="searchPreviewTh searchPreviewThR">Year</th>
              <th className="searchPreviewTh searchPreviewThR">Citations</th>
            </tr>
          </thead>
          <tbody>
            {results.map((p) => (
              <tr
                key={p.id}
                className="searchPreviewTr"
                onClick={(e) => { e.stopPropagation(); navigate(`/paper/${p.id}`); }}
              >
                <td className="searchPreviewTd searchPreviewTdTitle">{p.title}</td>
                <td className="searchPreviewTd searchPreviewTdR">{p.publicationYear}</td>
                <td className="searchPreviewTd searchPreviewTdR">{p.citedByCount?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
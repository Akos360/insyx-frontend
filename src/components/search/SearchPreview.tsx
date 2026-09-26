import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import { searchWorks, type Work } from "../../api/works";
import "./SearchPreview.css";

export default function SearchPreview() {
  const [items, setItems] = useState<Work[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      searchWorks({ search: query || undefined, limit: 20 })
        .then((page) => setItems(page.items))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

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
            {items.map((w) => (
              <tr
                key={w.id}
                className="searchPreviewTr"
                onClick={(e) => { e.stopPropagation(); navigate(`/paper/${w.id}`); }}
              >
                <td className="searchPreviewTd searchPreviewTdTitle">{w.title}</td>
                <td className="searchPreviewTd searchPreviewTdR">{w.publication_year}</td>
                <td className="searchPreviewTd searchPreviewTdR">{w.cited_by_count?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

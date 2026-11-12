import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BsSearch } from "react-icons/bs";
import { searchWorks } from "../../api/works";
import Highlight from "../common/Highlight";
import "./SearchPreview.css";

const PREVIEW_LIMIT = 20;

export default function SearchPreview() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // isPending (not isLoading): see SearchPage.tsx for why, under
  // PersistQueryClientProvider.
  const { data, isPending: loading } = useQuery({
    queryKey: ['works', 'search-preview', { search: debouncedQuery || undefined, limit: PREVIEW_LIMIT }],
    queryFn: () => searchWorks({ search: debouncedQuery || undefined, limit: PREVIEW_LIMIT }),
    placeholderData: (prev) => prev,
  });
  const items = data?.items ?? [];

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
              <th className="searchPreviewTh searchPreviewThR searchPreviewThYear">Year</th>
              <th className="searchPreviewTh searchPreviewThR searchPreviewThCitations">Citations</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
              <tr key={`skel-${i}`} className="searchPreviewTr" aria-hidden="true">
                <td className="searchPreviewTd searchPreviewTdTitle">
                  <span className="uiSkel" style={{ display: "block", height: 12, width: `${55 + (i % 3) * 12}%` }} />
                </td>
                <td className="searchPreviewTd searchPreviewTdR">
                  <span className="uiSkel" style={{ display: "inline-block", height: 11, width: 28 }} />
                </td>
                <td className="searchPreviewTd searchPreviewTdR">
                  <span className="uiSkel" style={{ display: "inline-block", height: 11, width: 36 }} />
                </td>
              </tr>
            ))}
            {!loading && items.map((w) => (
              <tr
                key={w.id}
                className="searchPreviewTr"
                onClick={(e) => { e.stopPropagation(); navigate(`/paper/${w.id}`); }}
              >
                <td className="searchPreviewTd searchPreviewTdTitle">
                  <Highlight text={w.title} query={query} />
                </td>
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

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getWork, getWorkCoAuthors, type WorkDetail } from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import "./paper-page.css";

export default function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: coAuthors = [] } = useQuery({
    queryKey: ['works', 'co-authors', id],
    queryFn: () => getWorkCoAuthors(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    getWork(id)
      .then(setPaper)
      .catch(() => setError("Paper not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="paperPage">
        <section className="paperPageCard">
          <div className="paperPageBlock">Loading...</div>
        </section>
      </main>
    );
  }

  if (error || !paper) {
    return (
      <main className="paperPage">
        <section className="paperPageCard">
          <div className="paperPageBlock">{error ?? "Paper not found."}</div>
          <button onClick={() => navigate("/search")}>Back to search</button>
        </section>
      </main>
    );
  }

  return (
    <main className="paperPage">
      <section className="paperPageCard">
        <div className="paperPageHeader">
          <p className="paperPageEyebrow">
            {[paper.domain, paper.field, paper.subfield].filter(Boolean).join(" / ")}
          </p>
          <h1 className="paperPageTitle">{paper.title}</h1>
        </div>

        <div className="paperPageContent">
          <div className="paperPageBlock paperPageMeta">
            <div className="paperPageMetaGrid">
              {paper.publication_year && <div><span className="metaLabel">Year</span><span>{paper.publication_year}</span></div>}
              {coAuthors.length > 0 ? (
                <div><span className="metaLabel">Authors</span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                    {coAuthors.map((a, i) => (
                      <span key={a.author_id}>
                        <Link to={`/author/${a.author_id}`} style={{ color: 'var(--app-accent, #6aaccc)', textDecoration: 'none' }}>
                          {humanizeAuthors(a.display_name) || a.author_id}
                        </Link>
                        {i < coAuthors.length - 1 && ','}
                      </span>
                    ))}
                  </span>
                </div>
              ) : paper.authors ? (
                <div><span className="metaLabel">Authors</span><span>{humanizeAuthors(paper.authors)}</span></div>
              ) : null}
              {paper.source_name && <div><span className="metaLabel">Source</span><span>{paper.source_name}</span></div>}
              {paper.cited_by_count != null && <div><span className="metaLabel">Citations</span><span>{paper.cited_by_count.toLocaleString()}</span></div>}
              {paper.primary_topic && <div><span className="metaLabel">Topic</span><span>{paper.primary_topic}</span></div>}
              {paper.is_oa && paper.oa_url && <div><span className="metaLabel">Open Access</span><a href={paper.oa_url} target="_blank" rel="noreferrer">{paper.oa_url}</a></div>}
              {paper.doi && <div><span className="metaLabel">DOI</span><span>{paper.doi}</span></div>}
            </div>
          </div>

          {paper.abstract && (
            <div className="paperPageBlock paperPageAbstract">
              <div>
                <p className="metaLabel">Abstract</p>
                <p className="paperPageAbstractText">{paper.abstract}</p>
              </div>
            </div>
          )}

          {paper.keywords && (
            <div className="paperPageBlock" style={{ minHeight: "auto", flexWrap: "wrap", gap: 8 }}>
              {paper.keywords.split(",").map((kw) => (
                <span key={kw} className="paperPageTag">{kw.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

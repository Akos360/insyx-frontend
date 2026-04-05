import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPaper, type Paper } from "../api/papers";
import { getAuthorsByPaper } from "../api/authors";
import "./paper-page.css";

export default function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: authorRecords = [] } = useQuery({
    queryKey: ['authors', 'paper', id],
    queryFn: () => getAuthorsByPaper(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    getPaper(id)
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
              {paper.publicationYear && <div><span className="metaLabel">Year</span><span>{paper.publicationYear}</span></div>}
              {authorRecords.length > 0 ? (
                <div><span className="metaLabel">Authors</span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                    {authorRecords.map((a, i) => (
                      <span key={a.authorId}>
                        <Link to={`/author/${a.authorId}`} style={{ color: 'var(--app-accent, #6aaccc)', textDecoration: 'none' }}>
                          {a.displayName ?? a.authorId}
                        </Link>
                        {i < authorRecords.length - 1 && ','}
                      </span>
                    ))}
                  </span>
                </div>
              ) : paper.authors ? (
                <div><span className="metaLabel">Authors</span><span>{paper.authors}</span></div>
              ) : null}
              {paper.sourceName && <div><span className="metaLabel">Source</span><span>{paper.sourceName}</span></div>}
              {paper.citedByCount != null && <div><span className="metaLabel">Citations</span><span>{paper.citedByCount.toLocaleString()}</span></div>}
              {paper.primaryTopic && <div><span className="metaLabel">Topic</span><span>{paper.primaryTopic}</span></div>}
              {paper.isOa && paper.oaUrl && <div><span className="metaLabel">Open Access</span><a href={paper.oaUrl} target="_blank" rel="noreferrer">{paper.oaUrl}</a></div>}
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
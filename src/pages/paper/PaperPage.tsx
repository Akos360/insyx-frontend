import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LuArrowLeft,
  LuBookOpen,
  LuBuilding2,
  LuCalendar,
  LuExternalLink,
  LuFileText,
  LuHash,
  LuInfo,
  LuLock,
  LuLockOpen,
  LuQuote,
  LuTags,
  LuUsers,
} from "react-icons/lu";
import { countryFlag, getWork, getWorkCoAuthors, getWorkTopics } from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import { fieldColorVar } from "../../utils/fieldColor";
import "./paper-page.css";

function humanizeSlug(value: string | null): string | null {
  if (!value) return null;
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(isoDate: string | null, year: number): string {
  if (!isoDate) return String(year);
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return String(year);
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
};

export default function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: paper, isLoading, isError } = useQuery({
    queryKey: ["works", "detail", id],
    queryFn: () => getWork(id!),
    enabled: !!id,
  });

  const { data: coAuthors = [] } = useQuery({
    queryKey: ["works", "co-authors", id],
    queryFn: () => getWorkCoAuthors(id!),
    enabled: !!id,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["works", "topics", id],
    queryFn: () => getWorkTopics(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <main className="paperPage">
        <div className="paperPageStatus">Loading…</div>
      </main>
    );
  }

  if (isError || !paper) {
    return (
      <main className="paperPage">
        <div className="paperPageStatus">
          <p>Paper not found.</p>
          <button type="button" className="uiBtn uiBtnSecondary" onClick={() => navigate("/search")}>
            Back to search
          </button>
        </div>
      </main>
    );
  }

  const institutions = Array.from(
    new Set(coAuthors.map((a) => a.first_institution_name).filter((n): n is string => Boolean(n))),
  );

  return (
    <main className="paperPage">
      <button type="button" className="paperBackLink" onClick={() => navigate(-1)}>
        <LuArrowLeft aria-hidden="true" />
        <span>Back</span>
      </button>

      <header className="paperHeader">
        <div className="paperTagRow">
          {paper.type && <span className="uiTag">{humanizeSlug(paper.type)}</span>}
          {paper.domain && <span className="uiTag">{paper.domain}</span>}
          {paper.field && (
            <span className="uiTag">
              <span className="uiTagDot" style={{ background: fieldColorVar(paper.field) }} />
              {paper.field}
            </span>
          )}
          {paper.subfield && <span className="uiTag uiTagMuted">{paper.subfield}</span>}
          <span className={"uiTag" + (paper.is_oa ? " uiTagAccent" : "")}>
            {paper.is_oa ? <LuLockOpen aria-hidden="true" /> : <LuLock aria-hidden="true" />}
            {paper.is_oa ? "Open access" : "Closed access"}
          </span>
        </div>

        <h1 className="paperTitle">{paper.title}</h1>

        <div className="paperByline">
          <span>{formatDate(paper.publication_date, paper.publication_year)}</span>
          {paper.source_name && (
            <>
              <span className="paperBylineDot">·</span>
              <span>{paper.source_name}</span>
            </>
          )}
          {paper.doi && (
            <>
              <span className="paperBylineDot">·</span>
              <a
                className="paperDoiLink"
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noreferrer"
              >
                doi.org/{paper.doi}
              </a>
            </>
          )}
        </div>
      </header>

      <div className="paperStatsRow">
        <div className="paperStat">
          <LuQuote aria-hidden="true" />
          <span className="mono">{paper.cited_by_count.toLocaleString()}</span>
          <span>citations</span>
        </div>
        {paper.referenced_works_count != null && (
          <div className="paperStat">
            <LuBookOpen aria-hidden="true" />
            <span className="mono">{paper.referenced_works_count.toLocaleString()}</span>
            <span>references</span>
          </div>
        )}
        {paper.num_authors != null && (
          <div className="paperStat">
            <LuUsers aria-hidden="true" />
            <span className="mono">{paper.num_authors}</span>
            <span>author{paper.num_authors === 1 ? "" : "s"}</span>
          </div>
        )}
        {paper.apc_usd != null && (
          <div className="paperStat">
            <span className="mono">
              ${paper.apc_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span>APC</span>
          </div>
        )}
      </div>

      <div className="paperLayout">
        <div className="paperMain">
          {paper.abstract && (
            <section className="uiCard paperCard">
              <div className="uiCardHead">
                <div className="uiCardTitle">
                  <LuFileText aria-hidden="true" />
                  <span>Abstract</span>
                </div>
              </div>
              <div className="paperCardBody">
                <p className="paperAbstract">{paper.abstract}</p>
              </div>
            </section>
          )}

          {topics.length > 0 && (
            <section className="uiCard paperCard">
              <div className="uiCardHead">
                <div className="uiCardTitle">
                  <LuTags aria-hidden="true" />
                  <span>Topics</span>
                </div>
              </div>
              <div className="paperCardBody paperTagRow">
                {topics.map((topic) => (
                  <span key={topic.topic_id} className="uiTag" title={`Relevance ${Math.round(topic.score * 100)}%`}>
                    {topic.display_name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {paper.keywords && (
            <section className="uiCard paperCard">
              <div className="uiCardHead">
                <div className="uiCardTitle">
                  <LuHash aria-hidden="true" />
                  <span>Keywords</span>
                </div>
              </div>
              <div className="paperCardBody paperTagRow">
                {paper.keywords.split(",").map((kw) => (
                  <span key={kw} className="uiTag uiTagMuted">{kw.trim()}</span>
                ))}
              </div>
            </section>
          )}

          <section className="uiCard paperCard">
            <div className="uiCardHead">
              <div className="uiCardTitle">
                <LuUsers aria-hidden="true" />
                <span>Authors</span>
              </div>
              <span className="uiTag">{coAuthors.length || paper.num_authors || "—"}</span>
            </div>
            <div className="paperCardBody">
              {coAuthors.length > 0 ? (
                <ul className="paperAuthorList">
                  {coAuthors.map((a) => (
                    <li key={a.author_id} className="paperAuthorRow">
                      <Link to={`/author/${a.author_id}`} className="paperAuthorName">
                        {humanizeAuthors(a.display_name) || a.author_id}
                      </Link>
                      <span className="paperAuthorMeta">
                        {a.country_code && <span>{countryFlag(a.country_code)}</span>}
                        {a.first_institution_name && <span>{a.first_institution_name}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="paperAbstract">{humanizeAuthors(paper.authors) || "No author data."}</p>
              )}
            </div>
          </section>
        </div>

        <aside className="paperSide">
          <section className="uiCard paperCard">
            <div className="uiCardHead">
              <div className="uiCardTitle">
                <LuInfo aria-hidden="true" />
                <span>Details</span>
              </div>
            </div>
            <div className="paperCardBody paperKvList">
              <div className="uiKv">
                <span>Published</span>
                <span>{formatDate(paper.publication_date, paper.publication_year)}</span>
              </div>
              {paper.type && (
                <div className="uiKv">
                  <span>Type</span>
                  <span>{humanizeSlug(paper.type)}</span>
                </div>
              )}
              {paper.source_name && (
                <div className="uiKv">
                  <span>Source</span>
                  <span>{paper.source_name}</span>
                </div>
              )}
              {paper.source_type && (
                <div className="uiKv">
                  <span>Source type</span>
                  <span>{humanizeSlug(paper.source_type)}</span>
                </div>
              )}
              {paper.language && (
                <div className="uiKv">
                  <span>Language</span>
                  <span>{LANGUAGE_NAMES[paper.language] ?? paper.language}</span>
                </div>
              )}
              {paper.license && (
                <div className="uiKv">
                  <span>License</span>
                  <span>{paper.license.toUpperCase()}</span>
                </div>
              )}
              {institutions.length > 0 && (
                <div className="uiKv">
                  <span><LuBuilding2 aria-hidden="true" style={{ marginRight: 4 }} />Institutions</span>
                  <span>{institutions.length}</span>
                </div>
              )}
            </div>
          </section>

          {(paper.oa_url || paper.pdf_url) && (
            <section className="uiCard paperCard">
              <div className="uiCardHead">
                <div className="uiCardTitle">
                  <LuCalendar aria-hidden="true" />
                  <span>Access</span>
                </div>
              </div>
              <div className="paperCardBody" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {paper.oa_url && (
                  <a className="uiBtn uiBtnSecondary" href={paper.oa_url} target="_blank" rel="noreferrer">
                    <LuExternalLink aria-hidden="true" />
                    <span>Open access page</span>
                  </a>
                )}
                {paper.pdf_url && (
                  <a className="uiBtn uiBtnSecondary" href={paper.pdf_url} target="_blank" rel="noreferrer">
                    <LuExternalLink aria-hidden="true" />
                    <span>PDF</span>
                  </a>
                )}
              </div>
            </section>
          )}

          {institutions.length > 0 && (
            <section className="uiCard paperCard">
              <div className="uiCardHead">
                <div className="uiCardTitle">
                  <LuBuilding2 aria-hidden="true" />
                  <span>Institutions</span>
                </div>
              </div>
              <div className="paperCardBody paperTagRow">
                {institutions.map((name) => (
                  <span key={name} className="uiTag uiTagMuted">{name}</span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
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
import BackLink from "../../components/common/BackLink";
import { countryFlag, getWork, getWorkCoAuthors, getWorkTopics } from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import { fieldColorVar } from "../../utils/fieldColor";
import { buildBibTeX } from "../../utils/bibtex";
import { doiUrl, bareDoi } from "../../utils/doi";
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

  // isPending, not isLoading — under PersistQueryClientProvider, isLoading is
  // falsely false during the IndexedDB-restore window (pending but not yet
  // fetching), which would flash the "not found" state on every hard refresh.
  const { data: paper, isPending, isError } = useQuery({
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

  const [authorSort, setAuthorSort] = useState<"name" | "institution">("name");
  const sortedCoAuthors = useMemo(() => {
    const key = authorSort === "name"
      ? (a: typeof coAuthors[number]) => humanizeAuthors(a.display_name) || a.author_id
      : (a: typeof coAuthors[number]) => a.first_institution_name ?? "￿"; // unknown institution sorts last
    return [...coAuthors].sort((a, b) => key(a).localeCompare(key(b)));
  }, [coAuthors, authorSort]);

  const [showCite, setShowCite] = useState(false);
  const [copied, setCopied] = useState(false);
  const bibtex = useMemo(() => (paper ? buildBibTeX(paper) : ""), [paper]);

  async function copyBibTeX() {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked (permissions/non-secure context) — the
      // BibTeX is still shown on screen to copy by hand.
    }
  }

  function downloadBibTeX() {
    const blob = new Blob([bibtex], { type: "application/x-bibtex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paper?.id ?? "citation"}.bib`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isPending) {
    return (
      <main className="paperPage">
        <BackLink label="Back" />
        <header className="paperHeader">
          <div className="paperTagRow">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="uiSkel" style={{ height: 24, width: 80, borderRadius: 999 }} />
            ))}
          </div>
          <span className="uiSkel" style={{ display: "block", height: 28, width: "70%" }} />
          <span className="uiSkel" style={{ display: "block", height: 13, width: 200 }} />
        </header>
        <div className="paperStatsRow">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="uiSkel" style={{ height: 16, width: 90, borderRadius: 4 }} />
          ))}
        </div>
        <div className="paperLayout">
          <div className="paperMain">
            <section className="uiCard paperCard">
              <div className="paperCardBody">
                <span className="uiSkel" style={{ display: "block", height: 13, width: "100%", marginBottom: 8 }} />
                <span className="uiSkel" style={{ display: "block", height: 13, width: "95%", marginBottom: 8 }} />
                <span className="uiSkel" style={{ display: "block", height: 13, width: "60%" }} />
              </div>
            </section>
          </div>
          <aside className="paperSide">
            <section className="uiCard paperCard">
              <div className="paperCardBody paperKvList">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="uiSkel" style={{ display: "block", height: 13, width: "100%", marginBottom: 10 }} />
                ))}
              </div>
            </section>
          </aside>
        </div>
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

  const institutions = paper.institutions ?? [];

  return (
    <main className="paperPage">
      <BackLink label="Back" />

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
                href={doiUrl(paper.doi)}
                target="_blank"
                rel="noreferrer"
              >
                doi.org/{bareDoi(paper.doi)}
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

          <section className="uiCard paperCard">
            <div className="uiCardHead">
              <div className="uiCardTitle">
                <LuUsers aria-hidden="true" />
                <span>Authors</span>
              </div>
              <div className="paperCardHeadActions">
                {coAuthors.length > 1 && (
                  <select
                    className="authorsSort"
                    value={authorSort}
                    onChange={(e) => setAuthorSort(e.target.value as typeof authorSort)}
                  >
                    <option value="name">Sort: Name</option>
                    <option value="institution">Sort: Institution</option>
                  </select>
                )}
                <span className="uiTag">{coAuthors.length || paper.num_authors || "—"}</span>
              </div>
            </div>
            <div className="paperCardBody">
              {coAuthors.length > 0 ? (
                <ul className="paperAuthorList">
                  {sortedCoAuthors.map((a) => (
                    <li key={a.author_id} className="paperAuthorRow">
                      <Link to={`/author/${a.author_id}`} className="paperAuthorName">
                        {humanizeAuthors(a.display_name) || a.author_id}
                      </Link>
                      <span className="paperAuthorMeta">
                        {a.country_code && <span>{countryFlag(a.country_code)}</span>}
                        {a.first_institution_name && (
                          <span className="paperAuthorInstitution" title={a.first_institution_name}>
                            {a.first_institution_name}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="paperAbstract">{humanizeAuthors(paper.authors) || "No author data."}</p>
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

          <section className="uiCard paperCard">
            <div className="uiCardHead">
              <div className="uiCardTitle">
                <LuQuote aria-hidden="true" />
                <span>Cite this paper</span>
              </div>
            </div>
            <div className="paperCardBody" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="uiBtn uiBtnSecondary"
                onClick={() => setShowCite((v) => !v)}
                aria-expanded={showCite}
              >
                <LuQuote aria-hidden="true" />
                <span>{showCite ? "Hide BibTeX" : "Show BibTeX"}</span>
              </button>
              {showCite && (
                <>
                  <pre className="paperBibtexBox">{bibtex}</pre>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="uiBtn uiBtnSecondary" onClick={copyBibTeX}>
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                    <button type="button" className="uiBtn uiBtnSecondary" onClick={downloadBibTeX}>
                      <span>Download .bib</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {institutions.length > 0 && (
            <section className="uiCard paperCard">
              <div className="uiCardHead">
                <div className="uiCardTitle">
                  <LuBuilding2 aria-hidden="true" />
                  <span>Institutions</span>
                </div>
              </div>
              <div className="paperCardBody paperTagRow">
                {institutions.map((inst) => (
                  <Link
                    key={inst.id}
                    to={`/institution/${inst.id}`}
                    className="uiTag uiTagMuted paperInstitutionTag"
                  >
                    {inst.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
